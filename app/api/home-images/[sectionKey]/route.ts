import { NextResponse } from "next/server";
import {
  HOME_IMAGE_KEYS,
  type HomeImageKey,
  getHomeImage,
  removeLocalHomeImageFile,
  saveHomeImageFile,
  setHomeImage,
} from "@/app/lib/home-images-store";

type JwtPayload = {
  role?: unknown;
  roles?: unknown;
  tipo?: unknown;
  perfil?: unknown;
  is_admin?: unknown;
  isAdmin?: unknown;
};

type SaveImageBody = {
  driveFileId?: unknown;
  googleAccessToken?: unknown;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isHomeImageKey(value: string): value is HomeImageKey {
  return HOME_IMAGE_KEYS.includes(value as HomeImageKey);
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as JwtPayload;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function normalizeRoleValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value.trim().toLowerCase()];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function isAdminFromJwt(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  if (payload.is_admin === true || payload.isAdmin === true) {
    return true;
  }

  const roles = [
    ...normalizeRoleValues(payload.role),
    ...normalizeRoleValues(payload.roles),
    ...normalizeRoleValues(payload.tipo),
    ...normalizeRoleValues(payload.perfil),
  ];

  return roles.some((role) => role === "admin" || role === "adm" || role === "administrator");
}

function resolveImageExtension(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();

  if (normalized === "image/png") {
    return "png";
  }

  if (normalized === "image/webp") {
    return "webp";
  }

  if (normalized === "image/gif") {
    return "gif";
  }

  if (normalized === "image/heic") {
    return "heic";
  }

  if (normalized === "image/heif") {
    return "heif";
  }

  return "jpg";
}

async function fetchDriveFileMetadata(driveFileId: string, googleAccessToken: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
}> {
  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      driveFileId,
    )}?fields=id,name,mimeType&supportsAllDrives=true`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
      cache: "no-store",
    },
  );

  const metadataPayload = (await metadataResponse.json().catch(() => null)) as
    | { id?: string; name?: string; mimeType?: string; error?: { message?: string } }
    | null;

  if (!metadataResponse.ok || !metadataPayload || typeof metadataPayload !== "object") {
    const message = metadataPayload?.error?.message ?? "Nao foi possivel ler o arquivo do Google Drive.";
    throw new Error(message);
  }

  const id = typeof metadataPayload.id === "string" ? metadataPayload.id : "";
  const name = typeof metadataPayload.name === "string" ? metadataPayload.name : "imagem";
  const mimeType = typeof metadataPayload.mimeType === "string" ? metadataPayload.mimeType : "";

  if (!id || !mimeType.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem no Google Drive.");
  }

  return { id, name, mimeType };
}

async function fetchDriveImageContent(driveFileId: string, googleAccessToken: string): Promise<Buffer> {
  const mediaResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media&supportsAllDrives=true`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!mediaResponse.ok) {
    throw new Error("Nao foi possivel baixar a imagem selecionada do Google Drive.");
  }

  const contentLength = mediaResponse.headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
    throw new Error("A imagem excede o limite de 10MB.");
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength === 0) {
    throw new Error("A imagem selecionada esta vazia.");
  }

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("A imagem excede o limite de 10MB.");
  }

  return buffer;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sectionKey: string }> },
) {
  const { sectionKey } = await context.params;

  if (!isHomeImageKey(sectionKey)) {
    return NextResponse.json({ message: "Secao de imagem invalida." }, { status: 404 });
  }

  const currentImage = await getHomeImage(sectionKey);

  return NextResponse.json({ image: currentImage }, { status: 200 });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ sectionKey: string }> },
) {
  const { sectionKey } = await context.params;

  if (!isHomeImageKey(sectionKey)) {
    return NextResponse.json({ message: "Secao de imagem invalida." }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const [tokenType, token] = authHeader.split(" ");

  if (!tokenType || !token) {
    return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
  }

  if (!isAdminFromJwt(token)) {
    return NextResponse.json({ message: "Apenas administradores podem alterar imagens." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as SaveImageBody | null;
  const driveFileId = typeof body?.driveFileId === "string" ? body.driveFileId.trim() : "";
  const googleAccessToken =
    typeof body?.googleAccessToken === "string" ? body.googleAccessToken.trim() : "";

  if (!driveFileId || !googleAccessToken) {
    return NextResponse.json({ message: "Arquivo do Drive invalido." }, { status: 400 });
  }

  try {
    const metadata = await fetchDriveFileMetadata(driveFileId, googleAccessToken);
    const buffer = await fetchDriveImageContent(driveFileId, googleAccessToken);
    const extension = resolveImageExtension(metadata.mimeType);

    const previousRecord = await getHomeImage(sectionKey);
    const imageUrl = await saveHomeImageFile({ sectionKey, buffer, extension });

    if (previousRecord?.imageUrl) {
      await removeLocalHomeImageFile(previousRecord.imageUrl);
    }

    const updatedRecord = {
      sectionKey,
      imageUrl,
      updatedAt: new Date().toISOString(),
      driveFileId: metadata.id,
      driveFileName: metadata.name,
    };

    await setHomeImage(updatedRecord);

    return NextResponse.json({ image: updatedRecord }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Erro ao atualizar imagem.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type JwtPayload = {
  sub?: string;
};

type UsuarioPayload = {
  id?: string;
  nome?: string;
  email?: string;
  tipo?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decodedPayload = Buffer.from(paddedPayload, "base64").toString("utf8");
    const payload = JSON.parse(decodedPayload) as JwtPayload;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const [tokenType, token] = authorizationHeader.split(" ");

    if (!tokenType || !token) {
      return NextResponse.json({ message: "Token invalido." }, { status: 401 });
    }

    const jwtPayload = decodeJwtPayload(token);

    if (!jwtPayload?.sub) {
      return NextResponse.json({ message: "Token invalido." }, { status: 401 });
    }

    const backendResponse = await fetch(buildBackendUrl(`/usuarios/${encodeURIComponent(jwtPayload.sub)}`), {
      method: "GET",
      headers: {
        Authorization: `${tokenType} ${token}`,
      },
      cache: "no-store",
    });

    const backendPayload = (await parseBackendPayload(backendResponse)) as UsuarioPayload | null;

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel carregar o perfil.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const nome = typeof backendPayload?.nome === "string" ? backendPayload.nome.trim() : "";
    const email = typeof backendPayload?.email === "string" ? backendPayload.email.trim() : "";
    const tipo = typeof backendPayload?.tipo === "string" ? backendPayload.tipo.trim().toUpperCase() : "";
    const id = typeof backendPayload?.id === "string" ? backendPayload.id : undefined;

    if (!nome) {
      return NextResponse.json({ message: "Perfil sem nome cadastrado." }, { status: 422 });
    }

    return NextResponse.json({ id, nome, email, tipo }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao consultar perfil." },
      { status: 500 },
    );
  }
}

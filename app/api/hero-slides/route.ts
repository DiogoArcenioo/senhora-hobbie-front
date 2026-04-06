import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";
import {
  DEFAULT_HERO_SLIDES,
  MAX_HERO_SLIDES,
  type HeroSlide,
  sanitizeHeroSlides,
} from "@/app/lib/hero-slides";

export const runtime = "nodejs";

const HERO_SLIDES_FILE_PATH = path.join(process.cwd(), "app", "data", "hero-slides.json");

type HeroSlidesBody = {
  slides?: unknown;
};

type HeroSlidesFileShape = {
  slides?: unknown;
};

type JwtPayload = {
  sub?: string;
};

type UsuarioPayload = {
  tipo?: string;
  message?: string | string[];
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

async function validateAdminAccess(request: Request): Promise<NextResponse | null> {
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

  try {
    const backendResponse = await fetch(
      buildBackendUrl(`/usuarios/${encodeURIComponent(jwtPayload.sub)}`),
      {
        method: "GET",
        headers: {
          Authorization: `${tokenType} ${token}`,
        },
        cache: "no-store",
      },
    );

    const backendPayload = (await parseBackendPayload(backendResponse)) as UsuarioPayload | null;

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(backendPayload) ??
        "Nao foi possivel validar permissao para editar o slider.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const tipo = typeof backendPayload?.tipo === "string" ? backendPayload.tipo.trim().toUpperCase() : "";

    if (tipo !== "ADM") {
      return NextResponse.json(
        { message: "Apenas usuarios ADM podem editar as fotos do slider." },
        { status: 403 },
      );
    }

    return null;
  } catch {
    return NextResponse.json(
      { message: "Erro ao validar permissao de administrador." },
      { status: 500 },
    );
  }
}

async function loadStoredHeroSlides(): Promise<HeroSlide[]> {
  try {
    const rawFile = await readFile(HERO_SLIDES_FILE_PATH, "utf8");
    const parsedFile = JSON.parse(rawFile) as HeroSlidesFileShape;
    const slides = sanitizeHeroSlides(parsedFile.slides);

    if (slides.length > 0) {
      return slides;
    }

    return DEFAULT_HERO_SLIDES;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_HERO_SLIDES;
    }

    return DEFAULT_HERO_SLIDES;
  }
}

async function persistHeroSlides(slides: HeroSlide[]): Promise<void> {
  await mkdir(path.dirname(HERO_SLIDES_FILE_PATH), { recursive: true });
  await writeFile(
    HERO_SLIDES_FILE_PATH,
    `${JSON.stringify({ slides }, null, 2)}\n`,
    "utf8",
  );
}

export async function GET() {
  try {
    const slides = await loadStoredHeroSlides();
    return NextResponse.json({ slides }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao carregar slider da home." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authErrorResponse = await validateAdminAccess(request);

    if (authErrorResponse) {
      return authErrorResponse;
    }

    const body = (await request.json()) as HeroSlidesBody;
    const slides = sanitizeHeroSlides(body.slides);

    if (slides.length === 0) {
      return NextResponse.json(
        { message: "Informe ao menos uma foto valida para o slider." },
        { status: 400 },
      );
    }

    if (slides.length > MAX_HERO_SLIDES) {
      return NextResponse.json(
        { message: `O limite maximo de fotos e ${MAX_HERO_SLIDES}.` },
        { status: 400 },
      );
    }

    await persistHeroSlides(slides);
    return NextResponse.json({ slides }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao salvar slider da home." },
      { status: 500 },
    );
  }
}

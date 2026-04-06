import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
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

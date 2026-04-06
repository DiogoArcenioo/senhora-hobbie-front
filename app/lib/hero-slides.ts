export const MAX_HERO_SLIDES = 4;
const MAX_REMOTE_URL_LENGTH = 2048;
const MAX_DATA_URL_LENGTH = 3_500_000;

export type HeroSlide = {
  id: string;
  imageUrl: string;
  alt: string;
};

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    imageUrl:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1800&q=80",
    alt: "Mesa de trabalho com materiais de arte em tons suaves.",
  },
  {
    id: "slide-2",
    imageUrl:
      "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=1800&q=80",
    alt: "Pessoa pintando com aquarela em um caderno aberto.",
  },
  {
    id: "slide-3",
    imageUrl:
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1800&q=80",
    alt: "Pincel, tintas e papieis organizados em bancada criativa.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAltText(value: string, index: number): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return `Foto do slide ${index}`;
  }

  return trimmedValue.slice(0, 180);
}

export function isAllowedHeroSlideUrl(value: string): boolean {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (trimmedValue.startsWith("data:image/")) {
    return trimmedValue.length <= MAX_DATA_URL_LENGTH && trimmedValue.includes(";base64,");
  }

  if (trimmedValue.length > MAX_REMOTE_URL_LENGTH) {
    return false;
  }

  if (trimmedValue.startsWith("/")) {
    return true;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeHeroSlides(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const usedIds = new Set<string>();
  const slides: HeroSlide[] = [];

  for (const rawSlide of input) {
    if (!isRecord(rawSlide)) {
      continue;
    }

    const imageUrl =
      typeof rawSlide.imageUrl === "string" ? rawSlide.imageUrl.trim() : "";

    if (!isAllowedHeroSlideUrl(imageUrl)) {
      continue;
    }

    const candidateId =
      typeof rawSlide.id === "string" ? rawSlide.id.trim() : "";
    const baseId = candidateId || `slide-${slides.length + 1}`;

    let resolvedId = baseId;
    let duplicateIndex = 1;

    while (usedIds.has(resolvedId)) {
      duplicateIndex += 1;
      resolvedId = `${baseId}-${duplicateIndex}`;
    }

    usedIds.add(resolvedId);

    const alt =
      typeof rawSlide.alt === "string"
        ? normalizeAltText(rawSlide.alt, slides.length + 1)
        : normalizeAltText("", slides.length + 1);

    slides.push({
      id: resolvedId,
      imageUrl,
      alt,
    });

    if (slides.length >= MAX_HERO_SLIDES) {
      break;
    }
  }

  return slides;
}

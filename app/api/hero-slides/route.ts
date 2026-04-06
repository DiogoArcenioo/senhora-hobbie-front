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

type HeroSlidesPayload = {
  slides?: unknown;
  imagens?: unknown;
  itens?: unknown;
  items?: unknown;
  fotos?: unknown;
  message?: string | string[];
};

type HeroSlideLike = {
  id?: string | number | null;
  imageUrl?: string | null;
  url?: string | null;
  urlPublica?: string | null;
  url_publica?: string | null;
  alt?: string | null;
  textoAlternativo?: string | null;
  texto_alternativo?: string | null;
  legenda?: string | null;
  ordem?: number | string | null;
  posicao?: number | string | null;
  indice?: number | string | null;
};

type BackendAttempt = {
  payload: unknown;
  response: Response;
};

const HERO_SLIDER_READ_PATHS = [
  "/imagens/site/home-slider",
  "/imagens/site/hero-slider",
  "/imagens/site/home-slides",
];

const HERO_SLIDER_WRITE_PATHS = [
  "/imagens/site/home-slider",
  "/imagens/site/hero-slider",
  "/imagens/site/home-slides",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlideItem(item: unknown, fallbackIndex: number): HeroSlide | null {
  if (!isRecord(item)) {
    return null;
  }

  const data = item as HeroSlideLike;
  const imageUrl = toStringValue(
    data.imageUrl ?? data.urlPublica ?? data.url_publica ?? data.url,
  );

  if (!imageUrl) {
    return null;
  }

  const idCandidate = data.id;
  const id =
    typeof idCandidate === "string" || typeof idCandidate === "number"
      ? String(idCandidate)
      : `slide-${fallbackIndex}`;

  const alt = toStringValue(
    data.alt ?? data.textoAlternativo ?? data.texto_alternativo ?? data.legenda,
  );

  return {
    id,
    imageUrl,
    alt: alt || `Foto do slide ${fallbackIndex}`,
  };
}

function extractSlidesFromPayload(payload: unknown): HeroSlide[] {
  if (Array.isArray(payload)) {
    return sanitizeHeroSlides(
      payload.map((item, index) => normalizeSlideItem(item, index + 1)).filter(Boolean),
    );
  }

  if (!isRecord(payload)) {
    return [];
  }

  const objectPayload = payload as HeroSlidesPayload;
  const candidates = [
    objectPayload.slides,
    objectPayload.imagens,
    objectPayload.itens,
    objectPayload.items,
    objectPayload.fotos,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const mapped = candidate
      .map((item, index) => {
        const normalized = normalizeSlideItem(item, index + 1);

        if (!normalized) {
          return null;
        }

        const order = isRecord(item)
          ? toNumber(
              (item as HeroSlideLike).ordem ??
                (item as HeroSlideLike).posicao ??
                (item as HeroSlideLike).indice,
            )
          : null;

        return {
          normalized,
          order,
          fallbackIndex: index,
        };
      })
      .filter(
        (
          item,
        ): item is { normalized: HeroSlide; order: number | null; fallbackIndex: number } =>
          item !== null,
      );

    const ordered = mapped
      .sort((a, b) => {
        if (a.order === null && b.order === null) {
          return a.fallbackIndex - b.fallbackIndex;
        }

        if (a.order === null) {
          return 1;
        }

        if (b.order === null) {
          return -1;
        }

        return a.order - b.order;
      })
      .map((item) => item.normalized);

    const sanitized = sanitizeHeroSlides(ordered);

    if (sanitized.length > 0) {
      return sanitized;
    }
  }

  return [];
}

function cloneFormData(source: FormData): FormData {
  const cloned = new FormData();

  for (const [key, value] of source.entries()) {
    cloned.append(key, value);
  }

  return cloned;
}

function createLegacyFormDataFromJson(rawBody: unknown): FormData {
  const payload = new FormData();

  if (!isRecord(rawBody)) {
    return payload;
  }

  const slides = (rawBody as { slides?: unknown }).slides;

  if (slides !== undefined) {
    payload.append("slides", JSON.stringify(slides));
  }

  return payload;
}

async function fetchSlidesFromBackend(): Promise<BackendAttempt | null> {
  let latestAttempt: BackendAttempt | null = null;

  for (const path of HERO_SLIDER_READ_PATHS) {
    const response = await fetch(buildBackendUrl(path), {
      method: "GET",
      cache: "no-store",
    });

    const payload = await parseBackendPayload(response);
    latestAttempt = { payload, response };

    if (response.ok) {
      return latestAttempt;
    }

    if (response.status !== 404 && response.status !== 405) {
      return latestAttempt;
    }
  }

  return latestAttempt;
}

async function sendSlidesToBackend(
  authorizationHeader: string,
  formData: FormData,
): Promise<BackendAttempt | null> {
  let latestAttempt: BackendAttempt | null = null;

  for (const path of HERO_SLIDER_WRITE_PATHS) {
    for (const method of ["PUT", "POST", "PATCH"]) {
      const response = await fetch(buildBackendUrl(path), {
        method,
        headers: {
          Authorization: authorizationHeader,
        },
        body: cloneFormData(formData),
        cache: "no-store",
      });

      const payload = await parseBackendPayload(response);
      latestAttempt = { payload, response };

      if (response.ok) {
        return latestAttempt;
      }

      if (response.status !== 404 && response.status !== 405) {
        return latestAttempt;
      }
    }
  }

  return latestAttempt;
}

async function parseRequestFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const jsonBody = (await request.json().catch(() => null)) as unknown;
    return createLegacyFormDataFromJson(jsonBody);
  }

  return request.formData();
}

export async function GET() {
  try {
    const backendAttempt = await fetchSlidesFromBackend();

    if (!backendAttempt) {
      return NextResponse.json({ slides: DEFAULT_HERO_SLIDES }, { status: 200 });
    }

    if (!backendAttempt.response.ok) {
      if (backendAttempt.response.status === 404 || backendAttempt.response.status === 405) {
        return NextResponse.json({ slides: DEFAULT_HERO_SLIDES }, { status: 200 });
      }

      const message =
        getBackendErrorMessage(backendAttempt.payload) ??
        "Nao foi possivel carregar as fotos do slider.";

      return NextResponse.json({ message }, { status: backendAttempt.response.status });
    }

    const slides = extractSlidesFromPayload(backendAttempt.payload);
    const normalizedSlides = slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;

    return NextResponse.json({ slides: normalizedSlides }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao carregar slider da home." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authorizationHeader = (request.headers.get("authorization") ?? "").trim();

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const formData = await parseRequestFormData(request);
    const rawSlidesConfig = formData.get("slides");

    if (typeof rawSlidesConfig !== "string" || !rawSlidesConfig.trim()) {
      return NextResponse.json(
        { message: "Configuracao de slides nao informada." },
        { status: 400 },
      );
    }

    const parsedSlidesConfig = JSON.parse(rawSlidesConfig) as unknown;
    const parsedSlidesCount = Array.isArray(parsedSlidesConfig) ? parsedSlidesConfig.length : 0;
    const sanitizedSlides = sanitizeHeroSlides(parsedSlidesConfig);

    if (parsedSlidesCount > MAX_HERO_SLIDES) {
      return NextResponse.json(
        { message: `O limite maximo de fotos e ${MAX_HERO_SLIDES}.` },
        { status: 400 },
      );
    }

    if (sanitizedSlides.length > MAX_HERO_SLIDES) {
      return NextResponse.json(
        { message: `O limite maximo de fotos e ${MAX_HERO_SLIDES}.` },
        { status: 400 },
      );
    }

    if (sanitizedSlides.length === 0 && !Array.from(formData.getAll("fotos")).some((file) => file instanceof File)) {
      return NextResponse.json(
        { message: "Informe ao menos uma foto para o slider." },
        { status: 400 },
      );
    }

    const backendAttempt = await sendSlidesToBackend(authorizationHeader, formData);

    if (!backendAttempt) {
      return NextResponse.json(
        { message: "Nao foi possivel salvar as fotos do slider no backend." },
        { status: 502 },
      );
    }

    if (!backendAttempt.response.ok) {
      if (backendAttempt.response.status === 404 || backendAttempt.response.status === 405) {
        return NextResponse.json(
          { message: "Endpoint de slider ainda nao disponivel no backend." },
          { status: 501 },
        );
      }

      const message =
        getBackendErrorMessage(backendAttempt.payload) ??
        "Nao foi possivel salvar as fotos do slider.";

      return NextResponse.json({ message }, { status: backendAttempt.response.status });
    }

    const backendSlides = extractSlidesFromPayload(backendAttempt.payload);

    if (backendSlides.length > 0) {
      return NextResponse.json({ slides: backendSlides }, { status: 200 });
    }

    const refreshedAttempt = await fetchSlidesFromBackend();
    const refreshedSlides = extractSlidesFromPayload(refreshedAttempt?.payload);

    if (refreshedSlides.length > 0) {
      return NextResponse.json({ slides: refreshedSlides }, { status: 200 });
    }

    return NextResponse.json({ slides: sanitizedSlides }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao salvar slider da home." },
      { status: 500 },
    );
  }
}

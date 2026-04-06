"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";
import {
  DEFAULT_HERO_SLIDES,
  MAX_HERO_SLIDES,
  type HeroSlide,
  sanitizeHeroSlides,
} from "@/app/lib/hero-slides";

type HeroSliderAdminPanelProps = {
  variant?: "page" | "modal";
  onSaved?: (slides: HeroSlide[]) => void;
  onClose?: () => void;
};

type HeroSlidesResponse = {
  slides?: unknown;
  message?: string;
};

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

type EditableSlide = HeroSlide;

function toEditableSlides(slides: HeroSlide[]): EditableSlide[] {
  return slides.map((slide) => ({
    id: slide.id,
    imageUrl: slide.imageUrl,
    alt: slide.alt,
  }));
}

function createDraftSlide(position: number): EditableSlide {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    id: `draft-${position}-${uniqueSuffix}`,
    imageUrl: "",
    alt: "",
  };
}

function resolveApiMessage(payload: HeroSlidesResponse | null, fallback: string): string {
  const message = payload?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function readAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isAdminUser(user: AuthUser | null): boolean {
  return typeof user?.tipo === "string" && user.tipo.trim().toUpperCase() === "ADM";
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decodedPayload = atob(paddedPayload);
    const payload = JSON.parse(decodedPayload) as JwtPayload;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.trim()) {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nao foi possivel ler a imagem selecionada."));
    };

    reader.onerror = () => {
      reject(new Error("Falha ao processar o arquivo da imagem."));
    };

    reader.readAsDataURL(file);
  });
}

function resolveAltFromFileName(fileName: string): string {
  const normalizedName = fileName.replace(/\.[^.]+$/, "").replaceAll(/[_-]+/g, " ").trim();
  return normalizedName.slice(0, 180);
}

function getAuthorizationHeader(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
  const tokenType = window.localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

  return token ? `${tokenType} ${token}` : "";
}

export default function HeroSliderAdminPanel({
  variant = "page",
  onSaved,
  onClose,
}: HeroSliderAdminPanelProps) {
  const [slides, setSlides] = useState<EditableSlide[]>(() =>
    toEditableSlides(DEFAULT_HERO_SLIDES),
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminFromToken, setIsAdminFromToken] = useState(false);
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSlideIndex, setUploadingSlideIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const syncAuthUser = () => {
      setAuthUser(readAuthUser());

      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
      const jwtPayload = decodeJwtPayload(token);
      const isAdmin =
        typeof jwtPayload?.tipo === "string" &&
        jwtPayload.tipo.trim().toUpperCase() === "ADM";

      setIsAdminFromToken(isAdmin);
      setHasResolvedAuth(true);
    };

    syncAuthUser();
    window.addEventListener(AUTH_SESSION_EVENT, syncAuthUser);
    window.addEventListener("storage", syncAuthUser);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAuthUser);
      window.removeEventListener("storage", syncAuthUser);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSlides = async () => {
      try {
        const response = await fetch("/api/hero-slides", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as HeroSlidesResponse | null;
        const parsedSlides = sanitizeHeroSlides(payload?.slides);

        if (isMounted && parsedSlides.length > 0) {
          setSlides(toEditableSlides(parsedSlides));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAdmin = useMemo(() => isAdminUser(authUser) || isAdminFromToken, [authUser, isAdminFromToken]);
  const canAddMoreSlides = slides.length < MAX_HERO_SLIDES;
  const isUploadingImage = uploadingSlideIndex !== null;
  const isModal = variant === "modal";
  const isAccessBlocked = hasResolvedAuth && !isAdmin;

  const slideCountLabel = useMemo(
    () => `${slides.length} de ${MAX_HERO_SLIDES} fotos configuradas`,
    [slides.length],
  );

  const updateSlideField = (
    index: number,
    field: keyof Pick<EditableSlide, "imageUrl" | "alt">,
    value: string,
  ) => {
    setSlides((previous) =>
      previous.map((slide, currentIndex) =>
        currentIndex === index
          ? {
              ...slide,
              [field]: value,
            }
          : slide,
      ),
    );
  };

  const addSlide = () => {
    if (!canAddMoreSlides || isSaving) {
      return;
    }

    setSlides((previous) => [...previous, createDraftSlide(previous.length + 1)]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const removeSlide = (index: number) => {
    if (isSaving || isUploadingImage) {
      return;
    }

    setSlides((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const moveSlide = (index: number, offset: -1 | 1) => {
    if (isSaving || isUploadingImage) {
      return;
    }

    const nextIndex = index + offset;

    if (nextIndex < 0 || nextIndex >= slides.length) {
      return;
    }

    setSlides((previous) => {
      const updated = [...previous];
      const [slide] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, slide);
      return updated;
    });

    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      setSuccessMessage("");
      setErrorMessage("Selecione um arquivo de imagem valido (jpg, png, webp...).");
      return;
    }

    if (file.size > 5_000_000) {
      setSuccessMessage("");
      setErrorMessage("Cada imagem deve ter no maximo 5 MB.");
      return;
    }

    setUploadingSlideIndex(index);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const dataUrl = await fileToDataUrl(file);
      const altFromName = resolveAltFromFileName(file.name);

      setSlides((previous) =>
        previous.map((slide, currentIndex) =>
          currentIndex === index
            ? {
                ...slide,
                imageUrl: dataUrl,
                alt: slide.alt.trim() || altFromName,
              }
            : slide,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Nao foi possivel carregar a imagem selecionada.";
      setErrorMessage(message);
    } finally {
      setUploadingSlideIndex(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving || isUploadingImage) {
      return;
    }

    const cleanedSlides = sanitizeHeroSlides(slides);

    if (cleanedSlides.length === 0) {
      setSuccessMessage("");
      setErrorMessage("Informe pelo menos uma URL valida para salvar o slider.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const authorizationHeader = getAuthorizationHeader();

      if (!authorizationHeader) {
        throw new Error("Faca login como ADM para editar as fotos do slider.");
      }

      const response = await fetch("/api/hero-slides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify({ slides: cleanedSlides }),
      });

      const payload = (await response.json().catch(() => null)) as HeroSlidesResponse | null;

      if (!response.ok) {
        throw new Error(resolveApiMessage(payload, "Nao foi possivel salvar o slider."));
      }

      const savedSlides = sanitizeHeroSlides(payload?.slides);
      const resolvedSlides = savedSlides.length > 0 ? savedSlides : cleanedSlides;
      setSlides(toEditableSlides(resolvedSlides));
      setSuccessMessage("Slider atualizado com sucesso.");
      onSaved?.(resolvedSlides);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao salvar slider.";

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAccessBlocked) {
    return (
      <section className={`admin-slider-panel${isModal ? " admin-slider-panel-modal" : ""}`}>
        <p className="admin-slider-kicker">Painel do slider principal</p>
        <h1>Fotos da home</h1>
        <p className="admin-slider-feedback admin-slider-feedback-error">
          Acesso restrito. Faca login com uma conta ADM para editar o slider.
        </p>
      </section>
    );
  }

  if (!hasResolvedAuth) {
    return (
      <section className={`admin-slider-panel${isModal ? " admin-slider-panel-modal" : ""}`}>
        <p className="admin-slider-kicker">Painel do slider principal</p>
        <h1>Fotos da home</h1>
        <p className="admin-slider-feedback">Validando permissao...</p>
      </section>
    );
  }

  return (
    <section className={`admin-slider-panel${isModal ? " admin-slider-panel-modal" : " reveal reveal-1"}`}>
      <div className="admin-slider-heading">
        <div>
          <p className="admin-slider-kicker">Painel do slider principal</p>
          <h1>Fotos da home</h1>
        </div>
        {isModal && onClose ? (
          <button
            type="button"
            className="admin-slider-close"
            onClick={onClose}
            aria-label="Fechar editor de fotos"
          >
            x
          </button>
        ) : null}
      </div>

      <p className="admin-slider-description">
        Defina de 1 a {MAX_HERO_SLIDES} imagens para o destaque inicial. Voce pode usar URL ou
        enviar arquivo, trocar ordem e remover.
      </p>
      <p className="admin-slider-count">{slideCountLabel}</p>

      <form className="admin-slider-form" onSubmit={handleSubmit}>
        <div className="admin-slider-grid">
          {slides.map((slide, index) => {
            const previewStyle: CSSProperties | undefined = slide.imageUrl.trim()
              ? {
                  backgroundImage: `url("${slide.imageUrl.replaceAll('"', "%22")}")`,
                }
              : undefined;

            return (
              <article key={slide.id} className="admin-slide-card">
                <div className="admin-slide-preview" style={previewStyle}>
                  {!slide.imageUrl.trim() ? <span>Sem imagem</span> : null}
                </div>

                <div className="admin-slide-meta">
                  <strong>Foto {index + 1}</strong>
                  <div className="admin-slide-order-actions">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, -1)}
                      disabled={isSaving || isUploadingImage || index === 0}
                    >
                      Subir
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 1)}
                      disabled={isSaving || isUploadingImage || index === slides.length - 1}
                    >
                      Descer
                    </button>
                  </div>
                </div>

                <label className="admin-slide-field">
                  URL da foto
                  <input
                    type="url"
                    placeholder="https://..."
                    value={slide.imageUrl}
                    onChange={(event) =>
                      updateSlideField(index, "imageUrl", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </label>

                <label className="admin-slide-field">
                  Texto alternativo (opcional)
                  <input
                    type="text"
                    placeholder={`Foto do slide ${index + 1}`}
                    value={slide.alt}
                    onChange={(event) => updateSlideField(index, "alt", event.target.value)}
                    disabled={isSaving}
                  />
                </label>

                <label className="admin-slide-field">
                  Enviar arquivo (opcional)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0];

                      if (selectedFile) {
                        void handleFileUpload(index, selectedFile);
                      }

                      event.currentTarget.value = "";
                    }}
                    disabled={isSaving || isUploadingImage}
                  />
                </label>

                <button
                  type="button"
                  className="admin-slide-remove"
                  onClick={() => removeSlide(index)}
                  disabled={isSaving || isUploadingImage || slides.length <= 1}
                >
                  Remover foto
                </button>
              </article>
            );
          })}
        </div>

        <div className="admin-slider-actions">
          <button
            type="button"
            className="btn btn-soft"
            onClick={addSlide}
            disabled={!canAddMoreSlides || isSaving || isUploadingImage}
          >
            Adicionar foto
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving || isUploadingImage}>
            {isUploadingImage ? "Processando imagem..." : isSaving ? "Salvando..." : "Salvar slider"}
          </button>
        </div>

        {isLoading ? <p className="admin-slider-feedback">Carregando configuracao atual...</p> : null}
        {successMessage ? (
          <p className="admin-slider-feedback admin-slider-feedback-success">{successMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className="admin-slider-feedback admin-slider-feedback-error">{errorMessage}</p>
        ) : null}
      </form>
    </section>
  );
}

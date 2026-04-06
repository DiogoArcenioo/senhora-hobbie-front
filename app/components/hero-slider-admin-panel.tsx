"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HERO_SLIDES,
  MAX_HERO_SLIDES,
  type HeroSlide,
  sanitizeHeroSlides,
} from "@/app/lib/hero-slides";

type HeroSlidesResponse = {
  slides?: unknown;
  message?: string;
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

export default function HeroSliderAdminPanel() {
  const [slides, setSlides] = useState<EditableSlide[]>(() =>
    toEditableSlides(DEFAULT_HERO_SLIDES),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSlideIndex, setUploadingSlideIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  const canAddMoreSlides = slides.length < MAX_HERO_SLIDES;
  const isUploadingImage = uploadingSlideIndex !== null;

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
      const response = await fetch("/api/hero-slides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
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

  return (
    <section className="admin-slider-panel reveal reveal-1">
      <p className="admin-slider-kicker">Painel do slider principal</p>
      <h1>Fotos da home</h1>
      <p className="admin-slider-description">
        Defina de 1 a {MAX_HERO_SLIDES} imagens para o destaque inicial. Voce pode usar URL ou
        enviar um arquivo do computador.
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

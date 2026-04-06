"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HERO_SLIDES,
  type HeroSlide,
  sanitizeHeroSlides,
} from "@/app/lib/hero-slides";

type HomeHeroSliderProps = {
  benefits: string[];
};

const AUTOPLAY_INTERVAL_MS = 5600;

type HeroSlidesResponse = {
  slides?: unknown;
  message?: string;
};

function clampIndex(index: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const remainder = index % total;
  return remainder >= 0 ? remainder : total + remainder;
}

export default function HomeHeroSlider({ benefits }: HomeHeroSliderProps) {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [activeIndex, setActiveIndex] = useState(0);

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
          setSlides(parsedSlides);
        }
      } catch {
        // Keep fallback slides when the endpoint is unavailable.
      }
    };

    void loadSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((previous) => clampIndex(previous + 1, slides.length));
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slides.length]);

  const activeSlide = slides[clampIndex(activeIndex, slides.length)] ?? DEFAULT_HERO_SLIDES[0];
  const canRotateSlides = slides.length > 1;
  const slideStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: `url("${activeSlide.imageUrl.replaceAll('"', "%22")}")`,
    }),
    [activeSlide.imageUrl],
  );

  const moveSlide = (offset: number) => {
    setActiveIndex((previous) => clampIndex(previous + offset, slides.length));
  };

  return (
    <section className="hero-slider reveal reveal-1" id="assinar">
      <div className="hero-slider-track" style={slideStyle} aria-label={activeSlide.alt}>
        <div className="hero-slider-scrim" aria-hidden="true" />

        <div className="hero-copy">
          <p className="hero-kicker">Arte em casa, todo mes</p>
          <h1>Seu hobby merece um clube delicado, criativo e cheio de cor.</h1>
          <p className="hero-description">
            Um espaco para explorar tecnicas, desacelerar a rotina e transformar tempo livre em
            criacao com proposito.
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary" href="/como-funciona">
              Comecar agora
            </Link>
            <Link className="btn btn-soft" href="/eventos">
              Ver edicao do mes
            </Link>
          </div>

          <ul className="hero-tags">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="hero-slider-controls" aria-label="Controles do slider principal">
          <button
            type="button"
            className="hero-slide-button"
            onClick={() => moveSlide(-1)}
            disabled={!canRotateSlides}
            aria-label="Foto anterior"
          >
            {"<"}
          </button>

          <p className="hero-slide-status">
            {clampIndex(activeIndex, slides.length) + 1}/{slides.length}
          </p>

          <div className="hero-slide-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={index === clampIndex(activeIndex, slides.length) ? "is-active" : undefined}
                aria-label={`Ir para foto ${index + 1}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>

          <button
            type="button"
            className="hero-slide-button"
            onClick={() => moveSlide(1)}
            disabled={!canRotateSlides}
            aria-label="Proxima foto"
          >
            {">"}
          </button>
        </div>
      </div>
    </section>
  );
}

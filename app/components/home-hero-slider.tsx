"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HeroSliderAdminPanel from "@/app/components/hero-slider-admin-panel";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "@/app/lib/auth-session";
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

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminFromToken, setIsAdminFromToken] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const syncAuthUser = () => {
      setAuthUser(readAuthUser());

      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
      const tokenPayload = decodeJwtPayload(token);
      const adminFromToken =
        typeof tokenPayload?.tipo === "string" &&
        tokenPayload.tipo.trim().toUpperCase() === "ADM";

      setIsAdminFromToken(adminFromToken);
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
    if (slides.length <= 1 || isEditModalOpen) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((previous) => clampIndex(previous + 1, slides.length));
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isEditModalOpen, slides.length]);

  useEffect(() => {
    if (!isEditModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isEditModalOpen]);

  const activeSlide = slides[clampIndex(activeIndex, slides.length)] ?? DEFAULT_HERO_SLIDES[0];
  const canRotateSlides = slides.length > 1;
  const isAdmin = useMemo(() => isAdminUser(authUser) || isAdminFromToken, [authUser, isAdminFromToken]);
  const slideStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: `url("${activeSlide.imageUrl.replaceAll('"', "%22")}")`,
    }),
    [activeSlide.imageUrl],
  );

  const moveSlide = (offset: number) => {
    setActiveIndex((previous) => clampIndex(previous + offset, slides.length));
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const openEditModal = () => {
    if (!isAdmin) {
      return;
    }

    setIsEditModalOpen(true);
  };

  const handleSlidesSaved = (nextSlides: HeroSlide[]) => {
    if (nextSlides.length === 0) {
      return;
    }

    setSlides(nextSlides);
    setActiveIndex((previous) => clampIndex(previous, nextSlides.length));
  };

  return (
    <>
      <section className="hero-slider reveal reveal-1" id="assinar">
        <div className="hero-slider-track" style={slideStyle} aria-label={activeSlide.alt}>
          {isAdmin ? (
            <button type="button" className="hero-slider-edit-button" onClick={openEditModal}>
              Editar fotos
            </button>
          ) : null}

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

      {isEditModalOpen ? (
        <div className="hero-slider-admin-backdrop" role="presentation" onClick={closeEditModal}>
          <section
            className="hero-slider-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Editor de fotos do slider principal"
            onClick={(event) => event.stopPropagation()}
          >
            <HeroSliderAdminPanel variant="modal" onSaved={handleSlidesSaved} onClose={closeEditModal} />
          </section>
        </div>
      ) : null}
    </>
  );
}

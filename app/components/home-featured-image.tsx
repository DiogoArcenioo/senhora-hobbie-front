"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";

type AuthUser = {
  id?: string;
  nome?: string;
  email?: string;
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

type ImagemPayload = {
  imagem?: {
    urlPublica?: string;
  } | null;
  message?: string;
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

export default function HomeFeaturedImage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminFromToken, setIsAdminFromToken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncAuthUser = () => {
      setAuthUser(readAuthUser());

      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
      const jwtPayload = decodeJwtPayload(token);
      const isAdmin =
        typeof jwtPayload?.tipo === "string" &&
        jwtPayload.tipo.trim().toUpperCase() === "ADM";

      setIsAdminFromToken(isAdmin);
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
    let cancelled = false;

    const loadImage = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/site-imagens/home-destaque", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as ImagemPayload | null;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setImageUrl(null);
          setErrorMessage(payload?.message ?? "Nao foi possivel carregar a imagem de destaque.");
          return;
        }

        const url = payload?.imagem?.urlPublica;
        setImageUrl(typeof url === "string" && url.trim() ? url : null);
      } catch {
        if (!cancelled) {
          setImageUrl(null);
          setErrorMessage("Erro inesperado ao carregar a imagem de destaque.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadImage();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = useMemo(() => isAdminUser(authUser) || isAdminFromToken, [authUser, isAdminFromToken]);

  const openFilePicker = () => {
    if (isUploading) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
    const tokenType = window.localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

    if (!token) {
      setErrorMessage("Faca login como ADM para editar a imagem.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("arquivo", file);

      const response = await fetch("/api/site-imagens/home-destaque", {
        method: "POST",
        headers: {
          Authorization: `${tokenType} ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImagemPayload | null;

      if (!response.ok) {
        setErrorMessage(payload?.message ?? "Nao foi possivel enviar a imagem.");
        return;
      }

      const nextUrl = payload?.imagem?.urlPublica;
      setImageUrl(typeof nextUrl === "string" && nextUrl.trim() ? nextUrl : null);
      setErrorMessage("");
    } catch {
      setErrorMessage("Erro inesperado ao enviar imagem.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="about-featured-image">
      {imageUrl ? (
        <img src={imageUrl} alt="Imagem em destaque" className="about-featured-image-preview" />
      ) : (
        <div className="about-image-placeholder">
          <span>{isLoading ? "Carregando imagem" : "Imagem em destaque"}</span>
          <strong>Pronto para receber sua foto</strong>
        </div>
      )}

      {isAdmin ? (
        <div className="about-image-actions">
          <button
            type="button"
            className="about-image-edit-button"
            onClick={openFilePicker}
            disabled={isUploading}
          >
            {isUploading ? "Enviando..." : "Editar imagem"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="about-image-input"
          />
        </div>
      ) : null}

      {errorMessage ? <p className="about-image-feedback">{errorMessage}</p> : null}
    </div>
  );
}

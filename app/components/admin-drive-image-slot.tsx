"use client";

import Image from "next/image";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";

type HomeImageResponse = {
  image?: {
    imageUrl?: string;
    updatedAt?: string;
  } | null;
  message?: string;
};

type Props = {
  sectionKey: "quem-somos";
  alt: string;
  className?: string;
  initialImageUrl?: string | null;
};

type JwtPayload = {
  role?: unknown;
  roles?: unknown;
  tipo?: unknown;
  perfil?: unknown;
  is_admin?: unknown;
  isAdmin?: unknown;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decodedPayload = atob(padded);
    const payload = JSON.parse(decodedPayload) as JwtPayload;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function normalizeRoles(value: unknown): string[] {
  if (typeof value === "string") {
    return [value.trim().toLowerCase()];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function hasAdminRole(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  if (payload.is_admin === true || payload.isAdmin === true) {
    return true;
  }

  const roles = [
    ...normalizeRoles(payload.role),
    ...normalizeRoles(payload.roles),
    ...normalizeRoles(payload.tipo),
    ...normalizeRoles(payload.perfil),
  ];

  return roles.some((role) => role === "admin" || role === "adm" || role === "administrator");
}

function resolveApiMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = (payload as HomeImageResponse).message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}

export default function AdminDriveImageSlot({ sectionKey, alt, className, initialImageUrl = null }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);
  const [isGoogleAccountsLoaded, setIsGoogleAccountsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const pickerApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY?.trim() ?? "";
  const pickerClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const pickerAppId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID?.trim() ?? "";

  const isPickerConfigured = useMemo(() => {
    return Boolean(pickerApiKey && pickerClientId);
  }, [pickerApiKey, pickerClientId]);

  useEffect(() => {
    const refreshAdminStatus = () => {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
      const authUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY) ?? "";

      const adminFromToken = token ? hasAdminRole(token) : false;
      const adminFromStorage = authUser.toLowerCase().includes("admin");

      setIsAdmin(adminFromToken || adminFromStorage);
    };

    refreshAdminStatus();
    window.addEventListener(AUTH_SESSION_EVENT, refreshAdminStatus);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, refreshAdminStatus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentImage = async () => {
      try {
        const response = await fetch(`/api/home-images/${sectionKey}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as HomeImageResponse | null;

        if (!response.ok || !payload || cancelled) {
          return;
        }

        const nextImageUrl = typeof payload.image?.imageUrl === "string" ? payload.image.imageUrl : null;
        if (nextImageUrl) {
          setImageUrl(nextImageUrl);
        }
      } catch {
        // Ignore fetch failures and keep current image state.
      }
    };

    void loadCurrentImage();

    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  const openPicker = (accessToken: string, onPick: (fileId: string) => Promise<void>) => {
    const googlePicker = window.google?.picker;

    if (!googlePicker) {
      throw new Error("Google Picker nao carregou corretamente.");
    }

    const pickerBuilder = new googlePicker.PickerBuilder()
      .addView(googlePicker.ViewId.DOCS_IMAGES)
      .setOAuthToken(accessToken)
      .setDeveloperKey(pickerApiKey)
      .enableFeature(googlePicker.Feature.NAV_HIDDEN)
      .setCallback((pickerData: Record<string, unknown>) => {
        const action = pickerData[googlePicker.Response.ACTION];

        if (action !== googlePicker.Action.PICKED) {
          return;
        }

        const pickedDocs = pickerData[googlePicker.Response.DOCUMENTS];

        if (!Array.isArray(pickedDocs) || pickedDocs.length === 0) {
          setFeedbackMessage("Nenhuma imagem foi selecionada.");
          return;
        }

        const firstDoc = pickedDocs[0] as Record<string, unknown>;
        const fileId = firstDoc[googlePicker.Document.ID];

        if (typeof fileId !== "string" || !fileId.trim()) {
          setFeedbackMessage("Nao foi possivel identificar a imagem escolhida.");
          return;
        }

        void onPick(fileId.trim());
      });

    if (pickerAppId) {
      pickerBuilder.setAppId(pickerAppId);
    }

    pickerBuilder.build().setVisible(true);
  };

  const handleSelectFromDrive = async () => {
    if (isSaving) {
      return;
    }

    if (!isPickerConfigured) {
      setFeedbackMessage(
        "Configure NEXT_PUBLIC_GOOGLE_API_KEY e NEXT_PUBLIC_GOOGLE_CLIENT_ID para habilitar o Google Drive.",
      );
      return;
    }

    if (!isPickerApiLoaded || !isGoogleAccountsLoaded || !window.google?.accounts?.oauth2 || !window.gapi) {
      setFeedbackMessage("Carregando integracao do Google. Tente novamente em alguns segundos.");
      return;
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const tokenType = window.localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

    if (!token) {
      setFeedbackMessage("Faca login como administrador para editar imagens.");
      return;
    }

    try {
      setFeedbackMessage("");

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: pickerClientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (tokenResponse) => {
          const accessToken = tokenResponse.access_token;

          if (!accessToken) {
            const errorMessage = tokenResponse.error
              ? `Falha ao autenticar com Google Drive: ${tokenResponse.error}`
              : "Falha ao autenticar com Google Drive.";

            setFeedbackMessage(errorMessage);
            return;
          }

          const persistSelectedImage = async (driveFileId: string) => {
            try {
              setIsSaving(true);

              const response = await fetch(`/api/home-images/${sectionKey}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `${tokenType} ${token}`,
                },
                body: JSON.stringify({
                  driveFileId,
                  googleAccessToken: accessToken,
                }),
              });

              const payload = (await response.json().catch(() => null)) as HomeImageResponse | null;

              if (!response.ok) {
                throw new Error(resolveApiMessage(payload, "Nao foi possivel salvar a imagem."));
              }

              const updatedImageUrl = typeof payload?.image?.imageUrl === "string" ? payload.image.imageUrl : "";

              if (!updatedImageUrl) {
                throw new Error("A imagem foi salva, mas o servidor nao retornou a URL final.");
              }

              setImageUrl(updatedImageUrl);
              setFeedbackMessage("Imagem atualizada com sucesso.");
            } catch (error) {
              const message =
                error instanceof Error && error.message
                  ? error.message
                  : "Erro inesperado ao salvar imagem selecionada.";
              setFeedbackMessage(message);
            } finally {
              setIsSaving(false);
            }
          };

          try {
            openPicker(accessToken, persistSelectedImage);
          } catch (error) {
            const message =
              error instanceof Error && error.message
                ? error.message
                : "Nao foi possivel abrir o seletor do Google Drive.";
            setFeedbackMessage(message);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao abrir o Google Drive.";
      setFeedbackMessage(message);
    }
  };

  const containerClassName = className ? `about-image-slot ${className}` : "about-image-slot";

  return (
    <>
      <Script
        src="https://apis.google.com/js/api.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.gapi?.load("picker", () => setIsPickerApiLoaded(true));
        }}
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGoogleAccountsLoaded(true)}
      />

      <div className={containerClassName}>
        {imageUrl ? (
          <Image src={imageUrl} alt={alt} className="about-image" fill sizes="(max-width: 980px) 100vw, 40vw" />
        ) : (
          <div className="about-image-placeholder" role="img" aria-label={alt}>
            <span>Imagem em destaque</span>
            <strong>Pronto para receber sua foto</strong>
          </div>
        )}

        {isAdmin ? (
          <button
            type="button"
            className="about-edit-btn"
            onClick={() => void handleSelectFromDrive()}
            disabled={isSaving}
            aria-label="Selecionar foto no Google Drive"
            title="Selecionar foto no Google Drive"
          >
            {isSaving ? "..." : "P"}
          </button>
        ) : null}
      </div>

      {feedbackMessage ? <p className="about-feedback-message">{feedbackMessage}</p> : null}
    </>
  );
}

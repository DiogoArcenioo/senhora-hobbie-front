"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
  emitAuthSessionChanged,
} from "@/app/lib/auth-session";

type AuthMode = "login" | "signup";

type AuthFormState = {
  name: string;
  email: string;
  password: string;
};

type AuthUser = {
  id?: string;
  nome: string;
  email: string;
  tipo?: string;
};

type AuthPayloadUser = {
  id?: string;
  nome?: string;
  email?: string;
  tipo?: string;
};

type AuthPayload = {
  access_token?: string;
  token_type?: string;
  user?: AuthPayloadUser;
  message?: string | string[];
};

type ToastVariant = "success" | "error";

type ToastMessage = {
  id: number;
  text: string;
  variant: ToastVariant;
};

type JwtPayload = {
  sub?: string;
  email?: string;
};

type MeResponse = {
  id?: string;
  nome?: string;
  email?: string;
  tipo?: string;
};

const TOAST_DURATION_MS = 4200;

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const { message } = payload as AuthPayload;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
    return message[0];
  }

  return fallbackMessage;
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

function readStoredUser(): AuthUser | null {
  const storedValue = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as AuthUser;

    if (
      parsedValue &&
      typeof parsedValue === "object" &&
      typeof parsedValue.nome === "string" &&
      parsedValue.nome.trim() &&
      typeof parsedValue.email === "string" &&
      parsedValue.email.trim()
    ) {
      return {
        id: typeof parsedValue.id === "string" && parsedValue.id.trim() ? parsedValue.id : undefined,
        nome: parsedValue.nome.trim(),
        email: parsedValue.email.trim(),
        tipo: typeof parsedValue.tipo === "string" ? parsedValue.tipo.trim().toUpperCase() : undefined,
      };
    }
  } catch {
    // Ignore invalid payload and clear key below.
  }

  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  return null;
}

function resolveAuthenticatedUser(
  payload: AuthPayload | null,
  fallback: { email: string; nome?: string },
): AuthUser {
  const payloadUser = payload?.user;
  const payloadEmail =
    payloadUser && typeof payloadUser.email === "string" ? payloadUser.email.trim() : "";
  const payloadName = payloadUser && typeof payloadUser.nome === "string" ? payloadUser.nome.trim() : "";
  const fallbackName = typeof fallback.nome === "string" ? fallback.nome.trim() : "";

  const email = payloadEmail || fallback.email.trim();
  const nome = payloadName || fallbackName || "Minha conta";

  return {
    id: payloadUser && typeof payloadUser.id === "string" ? payloadUser.id : undefined,
    nome,
    email,
    tipo: payloadUser && typeof payloadUser.tipo === "string" ? payloadUser.tipo.trim().toUpperCase() : undefined,
  };
}

async function fetchAuthenticatedUser(token: string, tokenType: string): Promise<AuthUser | null> {
  try {
    const meResponse = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `${tokenType} ${token}`,
      },
      cache: "no-store",
    });

    const mePayload = (await meResponse.json().catch(() => null)) as MeResponse | null;

    if (!meResponse.ok || !mePayload || typeof mePayload !== "object") {
      return null;
    }

    const nome = typeof mePayload.nome === "string" ? mePayload.nome.trim() : "";
    const email = typeof mePayload.email === "string" ? mePayload.email.trim() : "";
    const tipo = typeof mePayload.tipo === "string" ? mePayload.tipo.trim().toUpperCase() : undefined;

    if (!nome) {
      return null;
    }

    return {
      id: typeof mePayload.id === "string" ? mePayload.id : undefined,
      nome,
      email,
      tipo,
    };
  } catch {
    return null;
  }
}

export default function HeaderAuthActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormState>({
    name: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAuthenticatedUser = async () => {
      const userFromStorage = readStoredUser();

      if (userFromStorage) {
        setAuthenticatedUser(userFromStorage);
      }

      const token = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!token) {
        return;
      }

      const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";
      const userFromApi = await fetchAuthenticatedUser(token, tokenType);

      if (cancelled) {
        return;
      }

      if (userFromApi) {
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userFromApi));
        setAuthenticatedUser(userFromApi);
        return;
      }

      if (userFromStorage) {
        return;
      }

      const tokenPayload = decodeJwtPayload(token);
      const fallbackUser: AuthUser = {
        id: typeof tokenPayload?.sub === "string" ? tokenPayload.sub : undefined,
        nome: "Minha conta",
        email: typeof tokenPayload?.email === "string" ? tokenPayload.email : "",
        tipo: undefined,
      };

      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(fallbackUser));
      setAuthenticatedUser(fallbackUser);
    };

    void hydrateAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timeoutRef = toastTimeoutsRef;

    return () => {
      for (const timeoutId of timeoutRef.current) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const pushToast = (text: string, variant: ToastVariant = "success") => {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);
    const toast: ToastMessage = { id: toastId, text, variant };

    setToasts((previous) => [...previous, toast]);

    const timeoutId = window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== toastId));
    }, TOAST_DURATION_MS);

    toastTimeoutsRef.current.push(timeoutId);
  };

  const openModal = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage("");
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setErrorMessage("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (!isSubmitting && event.key === "Escape") {
        closeModal();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSubmitting]);

  const onFieldChange = (field: keyof AuthFormState, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TYPE_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    emitAuthSessionChanged();

    setAuthenticatedUser(null);
    setForm({
      name: "",
      email: "",
      password: "",
    });
    setErrorMessage("");
    closeModal();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const email = form.email.trim();
    const password = form.password;
    const name = form.name.trim();

    if (!email || !password || (mode === "signup" && !name)) {
      setErrorMessage("Preencha os campos obrigatorios para continuar.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const signupResponse = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: name,
            email,
            senha_hash: password,
          }),
        });

        const signupPayload = (await signupResponse
          .json()
          .catch(() => null)) as AuthPayload | null;

        if (!signupResponse.ok) {
          throw new Error(resolveErrorMessage(signupPayload, "Nao foi possivel concluir o cadastro."));
        }
      }

      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          senha: password,
        }),
      });

      const loginPayload = (await loginResponse.json().catch(() => null)) as AuthPayload | null;

      if (!loginResponse.ok) {
        const fallbackMessage =
          mode === "login"
            ? "Nao foi possivel realizar o login."
            : "Cadastro concluido, mas nao foi possivel autenticar.";

        throw new Error(resolveErrorMessage(loginPayload, fallbackMessage));
      }

      if (!loginPayload?.access_token || typeof loginPayload.access_token !== "string") {
        throw new Error("Resposta invalida do servidor de autenticacao.");
      }

      const tokenType =
        typeof loginPayload.token_type === "string" && loginPayload.token_type.trim()
          ? loginPayload.token_type
          : "Bearer";

      const initialUser = resolveAuthenticatedUser(loginPayload, {
        email,
        nome: mode === "signup" ? name : undefined,
      });
      const resolvedUser =
        initialUser.nome === "Minha conta"
          ? await fetchAuthenticatedUser(loginPayload.access_token, tokenType)
          : null;
      const user = resolvedUser ?? initialUser;

      localStorage.setItem(TOKEN_STORAGE_KEY, loginPayload.access_token);
      localStorage.setItem(TOKEN_TYPE_STORAGE_KEY, tokenType);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      emitAuthSessionChanged();
      setAuthenticatedUser(user);

      setForm({
        name: "",
        email: "",
        password: "",
      });

      closeModal();

      if (mode === "signup") {
        pushToast(`Cadastro confirmado. Seja bem-vinda, ${user.nome}!`);
      } else {
        pushToast(`Login realizado com sucesso. Ola, ${user.nome}!`);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao processar autenticacao.";

      setErrorMessage(message);
      pushToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canUsePortal = typeof document !== "undefined";

  const modal = isOpen ? (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) {
          closeModal();
        }
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="auth-close"
          onClick={closeModal}
          aria-label="Fechar"
          disabled={isSubmitting}
        >
          x
        </button>

        <p className="auth-kicker">{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</p>
        <h2 id="auth-modal-title">{mode === "login" ? "Entrar" : "Cadastro"}</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="auth-field">
              Nome completo
              <input
                type="text"
                name="name"
                placeholder="Seu nome"
                autoComplete="name"
                value={form.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                disabled={isSubmitting}
                required
              />
            </label>
          )}

          <label className="auth-field">
            E-mail
            <input
              type="email"
              name="email"
              placeholder="voce@email.com"
              autoComplete="email"
              value={form.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>

          <label className="auth-field">
            Senha
            <input
              type="password"
              name="password"
              placeholder="Digite sua senha"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(event) => onFieldChange("password", event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        {errorMessage ? (
          <p className="auth-feedback auth-feedback-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="auth-switch">
          <button
            type="button"
            className={mode === "login" ? "is-active" : ""}
            onClick={() => {
              setMode("login");
              setErrorMessage("");
            }}
            disabled={isSubmitting}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
            }}
            disabled={isSubmitting}
          >
            Cadastro
          </button>
        </div>
      </section>
    </div>
  ) : null;

  const toastStack = toasts.length > 0 ? (
    <div className="auth-toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <p
          key={toast.id}
          className={`auth-toast ${toast.variant === "error" ? "auth-toast-error" : "auth-toast-success"}`}
        >
          {toast.text}
        </p>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div className="header-actions" aria-label="Acesso de conta">
        {authenticatedUser ? (
          <>
            <span className="header-user-name" title={authenticatedUser.email || authenticatedUser.nome}>
              {authenticatedUser.nome}
            </span>
            <button type="button" className="header-logout" onClick={logout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <button type="button" className="header-login" onClick={() => openModal("login")}>
              Login
            </button>
            <button type="button" className="header-signup" onClick={() => openModal("signup")}>
              Cadastro
            </button>
          </>
        )}
      </div>

      {canUsePortal && modal ? createPortal(modal, document.body) : null}
      {canUsePortal && toastStack ? createPortal(toastStack, document.body) : null}
    </>
  );
}

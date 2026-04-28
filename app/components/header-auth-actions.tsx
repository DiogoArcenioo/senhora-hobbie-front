"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
  clearAuthSession,
  emitAuthSessionChanged,
  getAuthSessionToken,
} from "@/app/lib/auth-session";

type AuthMode = "login" | "signup";
type SignupStep = 1 | 2;

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
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
  tipo?: string;
};

type MeResponse = {
  id?: string;
  nome?: string;
  email?: string;
  tipo?: string;
};

const TOAST_DURATION_MS = 4200;
const INITIAL_AUTH_FORM: AuthFormState = {
  name: "",
  email: "",
  password: "",
  cep: "",
  estado: "",
  cidade: "",
  bairro: "",
  logradouro: "",
  numero: "",
  complemento: "",
};

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return isVisible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.1 3.51 3.51 2.1l18.39 18.39-1.41 1.41-3.16-3.16A11.2 11.2 0 0 1 12 20C5.5 20 2 12 2 12a19.2 19.2 0 0 1 4.11-5.6L2.1 3.51Zm5.44 4.3A15.4 15.4 0 0 0 4.25 12C5.08 13.7 7.9 18 12 18a8.7 8.7 0 0 0 3.82-.87l-2.25-2.25A3.5 3.5 0 0 1 9.12 10.43L7.54 7.81Zm3.07 3.07A1.5 1.5 0 0 0 12 14a1.55 1.55 0 0 0 .39-.05l-1.78-1.78A1.55 1.55 0 0 0 10.56 12Zm1.17-6.86L12 4c6.5 0 10 8 10 8a18.8 18.8 0 0 1-2.28 3.47l-1.43-1.43A15.6 15.6 0 0 0 19.75 12C18.92 10.3 16.1 6 12 6a8.46 8.46 0 0 0-1.48.13L8.88 4.49A10.95 10.95 0 0 1 11.78 4.02Zm2.68 5.52A3.5 3.5 0 0 1 16 12c0 .32-.04.62-.12.91l-4.79-4.79A3.52 3.52 0 0 1 14.46 9.54Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4c6.5 0 10 8 10 8s-3.5 8-10 8S2 12 2 12s3.5-8 10-8Zm0 2c-4.12 0-6.93 4.3-7.75 6 .82 1.7 3.63 6 7.75 6s6.93-4.3 7.75-6c-.82-1.7-3.63-6-7.75-6Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  );
}

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

function resolveFallbackUserFromToken(token: string): AuthUser {
  const tokenPayload = decodeJwtPayload(token);

  return {
    id: typeof tokenPayload?.sub === "string" ? tokenPayload.sub : undefined,
    nome: "Minha conta",
    email: typeof tokenPayload?.email === "string" ? tokenPayload.email : "",
    tipo:
      typeof tokenPayload?.tipo === "string" && tokenPayload.tipo.trim()
        ? tokenPayload.tipo.trim().toUpperCase()
        : undefined,
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
  const passwordFieldId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [form, setForm] = useState<AuthFormState>(INITIAL_AUTH_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAuthenticatedUser = async () => {
      const token = getAuthSessionToken();

      if (!token) {
        setAuthenticatedUser(null);
        return;
      }

      const userFromStorage = readStoredUser();

      if (userFromStorage) {
        setAuthenticatedUser(userFromStorage);
      }

      const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";
      const userFromApi = await fetchAuthenticatedUser(token, tokenType);

      if (cancelled) {
        return;
      }

      if (userFromApi) {
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userFromApi));
        setAuthenticatedUser(userFromApi);
        emitAuthSessionChanged();
        return;
      }

      if (userFromStorage) {
        const tokenPayload = decodeJwtPayload(token);

        if (
          !userFromStorage.tipo &&
          typeof tokenPayload?.tipo === "string" &&
          tokenPayload.tipo.trim()
        ) {
          const syncedUser = {
            ...userFromStorage,
            tipo: tokenPayload.tipo.trim().toUpperCase(),
          };

          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(syncedUser));
          setAuthenticatedUser(syncedUser);
          emitAuthSessionChanged();
        }

        return;
      }

      const fallbackUser = resolveFallbackUserFromToken(token);

      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(fallbackUser));
      setAuthenticatedUser(fallbackUser);
      emitAuthSessionChanged();
    };

    void hydrateAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncFromSession = () => {
      const token = getAuthSessionToken();

      if (!token) {
        setAuthenticatedUser(null);
        return;
      }

      const userFromStorage = readStoredUser();

      if (userFromStorage) {
        setAuthenticatedUser(userFromStorage);
        return;
      }

      const fallbackUser = resolveFallbackUserFromToken(token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(fallbackUser));
      setAuthenticatedUser(fallbackUser);
    };

    syncFromSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncFromSession);
    window.addEventListener("storage", syncFromSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncFromSession);
      window.removeEventListener("storage", syncFromSession);
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

  const resetSignupFlow = () => {
    setSignupStep(1);
    setForm(INITIAL_AUTH_FORM);
    setIsPasswordVisible(false);
    setErrorMessage("");
  };

  const openModal = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSignupStep(1);
    setIsPasswordVisible(false);
    setErrorMessage("");
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSignupStep(1);
    setIsPasswordVisible(false);
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
    clearAuthSession({ emitEvent: true });

    setAuthenticatedUser(null);
    resetSignupFlow();
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
    const cep = form.cep.trim();
    const estado = form.estado.trim();
    const cidade = form.cidade.trim();
    const bairro = form.bairro.trim();
    const logradouro = form.logradouro.trim();
    const numero = form.numero.trim();
    const complemento = form.complemento.trim();

    const signupStepOneMissing = !name || !email || !password;
    const signupAddressMissing = !cep || !estado || !cidade || !bairro || !logradouro || !numero;

    if (mode === "signup" && signupStep === 1) {
      if (signupStepOneMissing) {
        setErrorMessage("Preencha nome, e-mail e senha para continuar.");
        return;
      }

      setErrorMessage("");
      setSignupStep(2);
      return;
    }

    if (!email || !password || (mode === "signup" && (signupStepOneMissing || signupAddressMissing))) {
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
            endereco: {
              cep,
              estado,
              cidade,
              bairro,
              logradouro,
              numero,
              complemento,
            },
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

      setForm(INITIAL_AUTH_FORM);
      setSignupStep(1);

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
  const passwordToggleLabel = isPasswordVisible ? "Ocultar senha" : "Mostrar senha";
  const renderPasswordField = (autoComplete: "current-password" | "new-password") => (
    <div className="auth-field">
      <label htmlFor={passwordFieldId}>Senha</label>
      <div className="auth-password-control">
        <input
          id={passwordFieldId}
          type={isPasswordVisible ? "text" : "password"}
          name="password"
          placeholder="Digite sua senha"
          autoComplete={autoComplete}
          value={form.password}
          onChange={(event) => onFieldChange("password", event.target.value)}
          disabled={isSubmitting}
          required
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setIsPasswordVisible((previous) => !previous)}
          aria-label={passwordToggleLabel}
          aria-pressed={isPasswordVisible}
          title={passwordToggleLabel}
          disabled={isSubmitting}
        >
          <EyeIcon isVisible={isPasswordVisible} />
        </button>
      </div>
    </div>
  );

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
          {mode === "signup" ? (
            <>
              <p className="auth-step-indicator">Etapa {signupStep} de 2</p>

              {signupStep === 1 ? (
                <>
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

                  {renderPasswordField("new-password")}
                </>
              ) : (
                <>
                  <label className="auth-field">
                    CEP
                    <input
                      type="text"
                      name="cep"
                      placeholder="00000-000"
                      autoComplete="postal-code"
                      value={form.cep}
                      onChange={(event) => onFieldChange("cep", event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </label>

                  <label className="auth-field">
                    Estado (UF)
                    <input
                      type="text"
                      name="estado"
                      placeholder="SP"
                      autoComplete="address-level1"
                      maxLength={2}
                      value={form.estado}
                      onChange={(event) => onFieldChange("estado", event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </label>

                  <label className="auth-field">
                    Cidade
                    <input
                      type="text"
                      name="cidade"
                      placeholder="Sua cidade"
                      autoComplete="address-level2"
                      value={form.cidade}
                      onChange={(event) => onFieldChange("cidade", event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </label>

                  <label className="auth-field">
                    Bairro
                    <input
                      type="text"
                      name="bairro"
                      placeholder="Seu bairro"
                      autoComplete="address-level3"
                      value={form.bairro}
                      onChange={(event) => onFieldChange("bairro", event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </label>

                  <label className="auth-field">
                    Logradouro
                    <input
                      type="text"
                      name="logradouro"
                      placeholder="Rua, avenida..."
                      autoComplete="street-address"
                      value={form.logradouro}
                      onChange={(event) => onFieldChange("logradouro", event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </label>

                  <label className="auth-field">
                    Numero
                    <input
                      type="text"
                      name="numero"
                      placeholder="123"
                      autoComplete="address-line2"
                      value={form.numero}
                      onChange={(event) => onFieldChange("numero", event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </label>

                  <label className="auth-field">
                    Complemento (opcional)
                    <input
                      type="text"
                      name="complemento"
                      placeholder="Apto, bloco, referencia"
                      autoComplete="address-line2"
                      value={form.complemento}
                      onChange={(event) => onFieldChange("complemento", event.target.value)}
                      disabled={isSubmitting}
                    />
                  </label>
                </>
              )}
            </>
          ) : (
            <>
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

              {renderPasswordField("current-password")}
            </>
          )}

          <div className={mode === "signup" ? "auth-step-actions" : undefined}>
            {mode === "signup" && signupStep === 2 ? (
              <button
                type="button"
                className="auth-step-secondary"
                onClick={() => {
                  setSignupStep(1);
                  setIsPasswordVisible(false);
                  setErrorMessage("");
                }}
                disabled={isSubmitting}
              >
                Voltar
              </button>
            ) : null}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? "Aguarde..." : mode === "login" ? "Entrar" : signupStep === 1 ? "Continuar" : "Cadastrar"}
            </button>
          </div>
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
              setSignupStep(1);
              setIsPasswordVisible(false);
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
              setSignupStep(1);
              setIsPasswordVisible(false);
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

  const successToasts = toasts.filter((toast) => toast.variant === "success");
  const errorToasts = toasts.filter((toast) => toast.variant === "error");

  const successToastStage = successToasts.length > 0 ? (
    <div className="auth-toast-stage" role="status" aria-live="polite">
      {successToasts.map((toast) => (
        <p
          key={toast.id}
          className="auth-toast auth-toast-success"
        >
          <span className="auth-toast-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M5 12.6 9.2 16.8 19 7" />
            </svg>
          </span>
          <span>{toast.text}</span>
        </p>
      ))}
    </div>
  ) : null;

  const errorToastStack = errorToasts.length > 0 ? (
    <div className="auth-toast-stack" role="status" aria-live="polite">
      {errorToasts.map((toast) => (
        <p
          key={toast.id}
          className="auth-toast auth-toast-error"
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
      {canUsePortal && successToastStage ? createPortal(successToastStage, document.body) : null}
      {canUsePortal && errorToastStack ? createPortal(errorToastStack, document.body) : null}
    </>
  );
}

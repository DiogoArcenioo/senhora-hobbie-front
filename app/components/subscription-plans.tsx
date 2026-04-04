"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "@/app/assinatura/page.module.css";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";

type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  valor: string | number;
  moeda: string;
  periodicidade_cobranca: string;
  duracao_dias: number | null;
  duracao_meses: number | null;
  ativo: boolean;
};

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

type ApiErrorPayload = {
  message?: string | string[];
};

type AssinaturaFormState = {
  nome: string;
  descricao: string;
  tipo: string;
  valor: string;
  moeda: string;
  periodicidade_cobranca: string;
  duracao_dias: string;
  duracao_meses: string;
  ativo: boolean;
};

const EMPTY_FORM: AssinaturaFormState = {
  nome: "",
  descricao: "",
  tipo: "ASSINATURA",
  valor: "",
  moeda: "BRL",
  periodicidade_cobranca: "MENSAL",
  duracao_dias: "",
  duracao_meses: "",
  ativo: true,
};

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const { message } = payload as ApiErrorPayload;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
    return message[0];
  }

  return fallbackMessage;
}

function formatCurrency(value: string | number, currencyCode: string): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  const normalizedCurrency = (currencyCode || "BRL").toUpperCase();

  if (Number.isNaN(numericValue)) {
    return `${value} ${normalizedCurrency}`;
  }

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${numericValue.toFixed(2)} ${normalizedCurrency}`;
  }
}

function formatPeriodicidade(periodicidade: string): string {
  return periodicidade.replaceAll("_", " ").toLowerCase();
}

function formatDuracao(plano: Plano): string {
  if (typeof plano.duracao_meses === "number" && plano.duracao_meses > 0) {
    return `${plano.duracao_meses} mes(es)`;
  }

  if (typeof plano.duracao_dias === "number" && plano.duracao_dias > 0) {
    return `${plano.duracao_dias} dia(s)`;
  }

  return "Sem duracao definida";
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

function isAdminUser(authUser: AuthUser | null): boolean {
  return typeof authUser?.tipo === "string" && authUser.tipo.trim().toUpperCase() === "ADM";
}

function getAuthorizationHeader(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";

  if (!token) {
    return null;
  }

  const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";
  return `${tokenType} ${token}`;
}

function mapPlanoToFormState(plano: Plano): AssinaturaFormState {
  return {
    nome: plano.nome,
    descricao: plano.descricao ?? "",
    tipo: plano.tipo,
    valor: String(plano.valor ?? ""),
    moeda: plano.moeda,
    periodicidade_cobranca: plano.periodicidade_cobranca,
    duracao_dias: typeof plano.duracao_dias === "number" ? String(plano.duracao_dias) : "",
    duracao_meses: typeof plano.duracao_meses === "number" ? String(plano.duracao_meses) : "",
    ativo: plano.ativo,
  };
}

export default function SubscriptionPlans() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AssinaturaFormState>(EMPTY_FORM);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const syncAdminAccess = useCallback(() => {
    const authUser = readAuthUser();
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const tokenPayload = decodeJwtPayload(token);

    const adminFromStorage = isAdminUser(authUser);
    const adminFromToken =
      typeof tokenPayload?.tipo === "string" && tokenPayload.tipo.trim().toUpperCase() === "ADM";

    setIsAdmin(adminFromStorage || adminFromToken);
  }, []);

  const loadPlanos = useCallback(async () => {
    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setErrorMessage("Faca login para visualizar os planos.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/planos", {
        method: "GET",
        headers: {
          Authorization: authorizationHeader,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar os planos."));
      }

      if (!Array.isArray(payload)) {
        throw new Error("Resposta invalida ao consultar os planos.");
      }

      setPlanos(payload as Plano[]);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao carregar os planos.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncAdminAccess();
    void loadPlanos();

    window.addEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
    window.addEventListener("storage", syncAdminAccess);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
      window.removeEventListener("storage", syncAdminAccess);
    };
  }, [loadPlanos, syncAdminAccess]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setModalError("");
    setModalSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (plano: Plano) => {
    setModalMode("edit");
    setEditingId(plano.id);
    setFormState(mapPlanoToFormState(plano));
    setModalError("");
    setModalSuccess("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving || isDeactivating) {
      return;
    }

    setIsModalOpen(false);
    setModalError("");
    setModalSuccess("");
  };

  const updateFormField = <K extends keyof AssinaturaFormState>(field: K, value: AssinaturaFormState[K]) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitAssinatura = async () => {
    if (isSaving) {
      return;
    }

    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setModalError("Faca login como admin para continuar.");
      return;
    }

    if (!formState.nome.trim() || !formState.valor.trim()) {
      setModalError("Nome e valor sao obrigatorios.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    setModalSuccess("");

    const payload = {
      nome: formState.nome,
      descricao: formState.descricao,
      tipo: formState.tipo,
      valor: formState.valor,
      moeda: formState.moeda,
      periodicidade_cobranca: formState.periodicidade_cobranca,
      duracao_dias: formState.duracao_dias.trim() ? formState.duracao_dias.trim() : null,
      duracao_meses: formState.duracao_meses.trim() ? formState.duracao_meses.trim() : null,
      ativo: formState.ativo,
    };

    const isEditing = modalMode === "edit" && typeof editingId === "string" && editingId.trim().length > 0;

    const endpoint = isEditing ? `/api/assinaturas/${encodeURIComponent(editingId!)}` : "/api/assinaturas";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(responsePayload, "Nao foi possivel salvar assinatura."));
      }

      setModalSuccess(isEditing ? "Assinatura atualizada com sucesso." : "Assinatura criada com sucesso.");
      await loadPlanos();

      if (!isEditing) {
        setFormState(EMPTY_FORM);
      }
    } catch (error) {
      setModalError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao salvar assinatura.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inativarAssinatura = async () => {
    if (!editingId || isDeactivating) {
      return;
    }

    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setModalError("Faca login como admin para continuar.");
      return;
    }

    setIsDeactivating(true);
    setModalError("");
    setModalSuccess("");

    try {
      const response = await fetch(`/api/assinaturas/${encodeURIComponent(editingId)}`, {
        method: "DELETE",
        headers: {
          Authorization: authorizationHeader,
        },
      });

      const responsePayload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(responsePayload, "Nao foi possivel inativar assinatura."));
      }

      setModalSuccess("Assinatura inativada com sucesso.");
      await loadPlanos();
    } catch (error) {
      setModalError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao inativar assinatura.",
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) {
    return <div className={styles.statePanel}>Carregando planos...</div>;
  }

  if (errorMessage) {
    return <div className={styles.statePanel}>{errorMessage}</div>;
  }

  return (
    <>
      {isAdmin ? (
        <div className={styles.adminActions}>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Nova assinatura
          </button>
        </div>
      ) : null}

      {planos.length === 0 ? (
        <div className={styles.statePanel}>Nenhum plano cadastrado na tabela public.planos.</div>
      ) : (
        <section className={styles.planGrid}>
          {planos.map((plano) => (
            <article key={plano.id} className={`${styles.planCard} ${plano.ativo ? "" : styles.inactive}`}>
              <small>{plano.tipo}</small>
              <h2>{plano.nome}</h2>
              <strong>{formatCurrency(plano.valor, plano.moeda)}</strong>
              <p>{plano.descricao?.trim() ? plano.descricao : "Sem descricao cadastrada para este plano."}</p>
              <ul>
                <li>Periodicidade: {formatPeriodicidade(plano.periodicidade_cobranca)}</li>
                <li>Duracao: {formatDuracao(plano)}</li>
                <li>Status: {plano.ativo ? "Ativo" : "Inativo"}</li>
              </ul>

              <div className={styles.planAdminRow}>
                {plano.ativo ? (
                  <Link
                    href={`/assinatura/checkout?planoId=${encodeURIComponent(plano.id)}`}
                    className={`btn btn-primary ${styles.planAction}`}
                  >
                    Assinar
                  </Link>
                ) : (
                  <span className={styles.planInactiveLabel}>Plano indisponivel</span>
                )}

                {isAdmin ? (
                  <button
                    type="button"
                    className={`btn btn-soft ${styles.planEditButton}`}
                    onClick={() => openEditModal(plano)}
                  >
                    Editar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}

      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={closeModal}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{modalMode === "create" ? "Nova assinatura" : "Editar assinatura"}</h3>
              <button type="button" className={styles.modalClose} onClick={closeModal} disabled={isSaving || isDeactivating}>
                Fechar
              </button>
            </div>

            <div className={styles.modalFormGrid}>
              <label>
                Nome
                <input
                  type="text"
                  value={formState.nome}
                  onChange={(event) => updateFormField("nome", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Tipo
                <input
                  type="text"
                  value={formState.tipo}
                  onChange={(event) => updateFormField("tipo", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Valor
                <input
                  type="text"
                  value={formState.valor}
                  onChange={(event) => updateFormField("valor", event.target.value)}
                  placeholder="Ex.: 79.90"
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Moeda
                <input
                  type="text"
                  value={formState.moeda}
                  onChange={(event) => updateFormField("moeda", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Periodicidade
                <input
                  type="text"
                  value={formState.periodicidade_cobranca}
                  onChange={(event) => updateFormField("periodicidade_cobranca", event.target.value)}
                  placeholder="Ex.: MENSAL"
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Duracao em dias
                <input
                  type="number"
                  min="1"
                  value={formState.duracao_dias}
                  onChange={(event) => updateFormField("duracao_dias", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Duracao em meses
                <input
                  type="number"
                  min="1"
                  value={formState.duracao_meses}
                  onChange={(event) => updateFormField("duracao_meses", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formState.ativo}
                  onChange={(event) => updateFormField("ativo", event.target.checked)}
                  disabled={isSaving || isDeactivating}
                />
                Ativo
              </label>

              <label className={styles.descriptionLabel}>
                Descricao
                <textarea
                  value={formState.descricao}
                  onChange={(event) => updateFormField("descricao", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>
            </div>

            {modalError ? <p className={styles.modalError}>{modalError}</p> : null}
            {modalSuccess ? <p className={styles.modalSuccess}>{modalSuccess}</p> : null}

            <div className={styles.modalActions}>
              <button type="button" className="btn btn-primary" onClick={submitAssinatura} disabled={isSaving || isDeactivating}>
                {isSaving ? "Salvando..." : modalMode === "create" ? "Cadastrar" : "Salvar"}
              </button>

              {modalMode === "edit" ? (
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={inativarAssinatura}
                  disabled={isSaving || isDeactivating}
                >
                  {isDeactivating ? "Inativando..." : "Inativar"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

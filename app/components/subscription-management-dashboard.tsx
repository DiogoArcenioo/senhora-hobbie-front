"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

type GestaoAssinaturaItem = {
  id: string;
  status: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string | null;
  planoId: string | null;
  planoNome: string;
  planoValor: string | null;
  planoMoeda: string | null;
  dataInicio: string | null;
  proximaCobrancaEm: string | null;
  createdAt: string;
  gateway: string | null;
  gatewayAssinaturaId: string | null;
  renovacaoAutomatica: boolean;
};

type GestaoAssinaturasPayload = {
  resumo?: {
    assinaturasAtivas?: unknown;
    novasAssinaturasMesAtual?: unknown;
    receitaMensalEstimada?: unknown;
    mesReferencia?: unknown;
  };
  assinaturasAtivas?: unknown;
  novasAssinaturasMesAtual?: unknown;
  message?: string;
};

type DashboardData = {
  assinaturasAtivas: GestaoAssinaturaItem[];
  novasAssinaturasMesAtual: GestaoAssinaturaItem[];
  resumo: {
    assinaturasAtivas: number;
    novasAssinaturasMesAtual: number;
    receitaMensalEstimada: number;
    mesReferencia: string;
  };
};

const EMPTY_DASHBOARD: DashboardData = {
  assinaturasAtivas: [],
  novasAssinaturasMesAtual: [],
  resumo: {
    assinaturasAtivas: 0,
    novasAssinaturasMesAtual: 0,
    receitaMensalEstimada: 0,
    mesReferencia: "",
  },
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

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const message = (payload as { message?: unknown }).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0) {
    const firstMessage = message.find((item) => typeof item === "string" && item.trim().length > 0);

    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  return fallbackMessage;
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

function parseAssinaturaItem(raw: unknown): GestaoAssinaturaItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const status = typeof value.status === "string" ? value.status.trim().toUpperCase() : "";
  const usuarioId = typeof value.usuarioId === "string" ? value.usuarioId.trim() : "";
  const usuarioNome = typeof value.usuarioNome === "string" ? value.usuarioNome.trim() : "";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt.trim() : "";

  if (!id || !status || !usuarioId || !usuarioNome || !createdAt) {
    return null;
  }

  return {
    id,
    status,
    usuarioId,
    usuarioNome,
    usuarioEmail: typeof value.usuarioEmail === "string" && value.usuarioEmail.trim() ? value.usuarioEmail.trim() : null,
    planoId: typeof value.planoId === "string" && value.planoId.trim() ? value.planoId.trim() : null,
    planoNome: typeof value.planoNome === "string" && value.planoNome.trim() ? value.planoNome.trim() : "Plano nao identificado",
    planoValor: typeof value.planoValor === "string" && value.planoValor.trim() ? value.planoValor.trim() : null,
    planoMoeda: typeof value.planoMoeda === "string" && value.planoMoeda.trim() ? value.planoMoeda.trim().toUpperCase() : null,
    dataInicio: typeof value.dataInicio === "string" && value.dataInicio.trim() ? value.dataInicio.trim() : null,
    proximaCobrancaEm:
      typeof value.proximaCobrancaEm === "string" && value.proximaCobrancaEm.trim() ? value.proximaCobrancaEm.trim() : null,
    createdAt,
    gateway: typeof value.gateway === "string" && value.gateway.trim() ? value.gateway.trim() : null,
    gatewayAssinaturaId:
      typeof value.gatewayAssinaturaId === "string" && value.gatewayAssinaturaId.trim()
        ? value.gatewayAssinaturaId.trim()
        : null,
    renovacaoAutomatica: value.renovacaoAutomatica === true || value.renovacaoAutomatica === undefined,
  };
}

function sanitizeDashboardPayload(payload: GestaoAssinaturasPayload | null): DashboardData {
  const assinaturasAtivasRaw = Array.isArray(payload?.assinaturasAtivas) ? payload?.assinaturasAtivas : [];
  const novasAssinaturasRaw = Array.isArray(payload?.novasAssinaturasMesAtual)
    ? payload?.novasAssinaturasMesAtual
    : [];

  const assinaturasAtivas = assinaturasAtivasRaw
    .map((item) => parseAssinaturaItem(item))
    .filter((item): item is GestaoAssinaturaItem => item !== null);
  const novasAssinaturasMesAtual = novasAssinaturasRaw
    .map((item) => parseAssinaturaItem(item))
    .filter((item): item is GestaoAssinaturaItem => item !== null);

  const resumoRaw = payload?.resumo;
  const assinaturasAtivasResumo =
    typeof resumoRaw?.assinaturasAtivas === "number" ? resumoRaw.assinaturasAtivas : assinaturasAtivas.length;
  const novasAssinaturasResumo =
    typeof resumoRaw?.novasAssinaturasMesAtual === "number"
      ? resumoRaw.novasAssinaturasMesAtual
      : novasAssinaturasMesAtual.length;
  const receitaMensalEstimada =
    typeof resumoRaw?.receitaMensalEstimada === "number" && Number.isFinite(resumoRaw.receitaMensalEstimada)
      ? resumoRaw.receitaMensalEstimada
      : assinaturasAtivas.reduce((total, item) => {
          const valor = Number(item.planoValor ?? "0");
          return Number.isFinite(valor) ? total + valor : total;
        }, 0);
  const mesReferencia =
    typeof resumoRaw?.mesReferencia === "string" && resumoRaw.mesReferencia.trim()
      ? resumoRaw.mesReferencia.trim()
      : "";

  return {
    assinaturasAtivas,
    novasAssinaturasMesAtual,
    resumo: {
      assinaturasAtivas: assinaturasAtivasResumo,
      novasAssinaturasMesAtual: novasAssinaturasResumo,
      receitaMensalEstimada,
      mesReferencia,
    },
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Nao informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value: string | null, currencyCode: string | null): string {
  if (!value) {
    return "Valor nao informado";
  }

  const numericValue = Number(value);
  const normalizedCurrency = (currencyCode || "BRL").toUpperCase();

  if (!Number.isFinite(numericValue)) {
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

function formatReferenceMonth(referenceMonth: string): string {
  if (!referenceMonth.trim()) {
    return "mes atual";
  }

  const [year, month] = referenceMonth.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);

  if (
    !Number.isInteger(parsedYear) ||
    !Number.isInteger(parsedMonth) ||
    parsedMonth < 1 ||
    parsedMonth > 12
  ) {
    return referenceMonth;
  }

  const date = new Date(parsedYear, parsedMonth - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatGatewayLabel(gateway: string | null): string {
  if (!gateway) {
    return "Nao informado";
  }

  if (gateway === "MERCADO_PAGO_SUBSCRIPTION") {
    return "Assinatura recorrente (MP)";
  }

  if (gateway === "MERCADO_PAGO") {
    return "Checkout Mercado Pago";
  }

  return gateway;
}

type SubscriptionListProps = {
  items: GestaoAssinaturaItem[];
  emptyMessage: string;
  onSync?: (item: GestaoAssinaturaItem) => void;
  onCancel?: (item: GestaoAssinaturaItem) => void;
  pendingActionId?: string | null;
};

function SubscriptionList({
  items,
  emptyMessage,
  onSync,
  onCancel,
  pendingActionId,
}: SubscriptionListProps) {
  if (items.length === 0) {
    return <p className="subscription-management-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="subscription-management-list">
      {items.map((item) => {
        const isPending = pendingActionId === item.id;
        const canSync = !!onSync && item.gateway === "MERCADO_PAGO_SUBSCRIPTION" && !!item.gatewayAssinaturaId;
        const canCancel = !!onCancel && item.status !== "CANCELLED";

        return (
          <li key={item.id} className="subscription-management-item">
            <div className="subscription-management-item-row">
              <strong>{item.usuarioNome}</strong>
              <span>{item.usuarioEmail ?? "Email nao informado"}</span>
            </div>

            <div className="subscription-management-item-row">
              <span>{item.planoNome}</span>
              <span>{formatCurrency(item.planoValor, item.planoMoeda)}</span>
            </div>

            <div className="subscription-management-item-row">
              <span>Inicio: {formatDateTime(item.dataInicio ?? item.createdAt)}</span>
              <span>
                Proxima cobranca: {item.proximaCobrancaEm ? formatDateTime(item.proximaCobrancaEm) : "Nao definida"}
              </span>
            </div>

            <div className="subscription-management-item-row">
              <span>Gateway: {formatGatewayLabel(item.gateway)}</span>
              <span>
                Renovacao automatica: {item.renovacaoAutomatica ? "Sim" : "Nao"}
              </span>
            </div>

            {(canSync || canCancel) && (
              <div className="subscription-management-item-row subscription-management-item-actions">
                {canSync ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onSync?.(item)}
                  >
                    {isPending ? "Sincronizando..." : "Sincronizar agora"}
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onCancel?.(item)}
                  >
                    {isPending ? "Processando..." : "Cancelar assinatura"}
                  </button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function SubscriptionManagementDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewSubscriptionsModalOpen, setIsNewSubscriptionsModalOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionFeedback, setActionFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const syncAdminAccess = useCallback(() => {
    const authUser = readAuthUser();
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const tokenPayload = decodeJwtPayload(token);

    const adminFromStorage = isAdminUser(authUser);
    const adminFromToken =
      typeof tokenPayload?.tipo === "string" && tokenPayload.tipo.trim().toUpperCase() === "ADM";

    setIsAdmin(adminFromStorage || adminFromToken);
  }, []);

  const loadDashboard = useCallback(async () => {
    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setErrorMessage("Faca login como ADM para acessar a gestao de assinaturas.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/gestao-assinaturas", {
        method: "GET",
        headers: {
          Authorization: authorizationHeader,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as GestaoAssinaturasPayload | null;

      if (!response.ok) {
        throw new Error(
          resolveErrorMessage(payload, "Nao foi possivel carregar a gestao de assinaturas."),
        );
      }

      setDashboard(sanitizeDashboardPayload(payload));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao carregar a gestao de assinaturas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncAdminAccess();
    void loadDashboard();

    window.addEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
    window.addEventListener("storage", syncAdminAccess);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
      window.removeEventListener("storage", syncAdminAccess);
    };
  }, [loadDashboard, syncAdminAccess]);

  const runAction = useCallback(
    async (item: GestaoAssinaturaItem, kind: "sync" | "cancelar") => {
      const authorizationHeader = getAuthorizationHeader();

      if (!authorizationHeader) {
        setActionFeedback({ type: "error", message: "Sessao expirada. Faca login novamente." });
        return;
      }

      if (kind === "cancelar") {
        const confirmed = window.confirm(
          `Cancelar a assinatura de ${item.usuarioNome}? O usuario perde o acesso imediatamente.`,
        );

        if (!confirmed) {
          return;
        }
      }

      setPendingActionId(item.id);
      setActionFeedback(null);

      try {
        const response = await fetch(
          `/api/admin/gestao-assinaturas/${encodeURIComponent(item.id)}/${kind}`,
          {
            method: "POST",
            headers: { Authorization: authorizationHeader },
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as { message?: string } | null;

        if (!response.ok) {
          throw new Error(resolveErrorMessage(payload, "Falha ao executar acao."));
        }

        setActionFeedback({
          type: "success",
          message: kind === "sync" ? "Assinatura sincronizada com sucesso." : "Assinatura cancelada.",
        });
        await loadDashboard();
      } catch (error) {
        setActionFeedback({
          type: "error",
          message:
            error instanceof Error && error.message ? error.message : "Erro inesperado ao executar a acao.",
        });
      } finally {
        setPendingActionId(null);
      }
    },
    [loadDashboard],
  );

  const handleSync = useCallback(
    (item: GestaoAssinaturaItem) => {
      void runAction(item, "sync");
    },
    [runAction],
  );

  const handleCancel = useCallback(
    (item: GestaoAssinaturaItem) => {
      void runAction(item, "cancelar");
    },
    [runAction],
  );

  const referenceMonthLabel = useMemo(
    () => formatReferenceMonth(dashboard.resumo.mesReferencia),
    [dashboard.resumo.mesReferencia],
  );

  if (!isAdmin) {
    return (
      <section className="subscription-management-panel reveal reveal-1">
        <p className="subscription-management-kicker">Gestao Assinaturas</p>
        <h1>Acesso restrito</h1>
        <p className="subscription-management-feedback">
          Esta area e exclusiva para administradoras.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="subscription-management-panel reveal reveal-1">
        <p className="subscription-management-kicker">Gestao Assinaturas</p>
        <h1>Resumo das assinaturas</h1>
        <p className="subscription-management-feedback">Carregando dados...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="subscription-management-panel reveal reveal-1">
        <p className="subscription-management-kicker">Gestao Assinaturas</p>
        <h1>Resumo das assinaturas</h1>
        <p className="subscription-management-feedback subscription-management-feedback-error">
          {errorMessage}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="subscription-management-panel reveal reveal-1">
        <p className="subscription-management-kicker">Gestao Assinaturas</p>
        <h1>Resumo das assinaturas</h1>
        <p className="subscription-management-description">
          Visao consolidada das assinaturas ativas e das novas assinaturas confirmadas no mes atual.
        </p>

        <div className="subscription-management-cards">
          <article className="subscription-management-card">
            <span>Assinaturas ativas</span>
            <strong>{dashboard.resumo.assinaturasAtivas}</strong>
            <small>Status ACTIVE</small>
          </article>

          <button
            type="button"
            className="subscription-management-card subscription-management-card-action"
            onClick={() => setIsNewSubscriptionsModalOpen(true)}
          >
            <span>Novas no mes atual</span>
            <strong>{dashboard.resumo.novasAssinaturasMesAtual}</strong>
            <small>Clique para ver quem assinou em {referenceMonthLabel}</small>
          </button>

          <article className="subscription-management-card">
            <span>Receita mensal estimada</span>
            <strong>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 2,
              }).format(dashboard.resumo.receitaMensalEstimada)}
            </strong>
            <small>Soma do valor dos planos ativos</small>
          </article>
        </div>

        {actionFeedback ? (
          <p
            className={`subscription-management-feedback ${
              actionFeedback.type === "error" ? "subscription-management-feedback-error" : ""
            }`}
          >
            {actionFeedback.message}
          </p>
        ) : null}
      </section>

      <section className="subscription-management-list-panel reveal reveal-2">
        <div className="subscription-management-list-header">
          <p>Assinaturas ativas</p>
          <h2>{dashboard.assinaturasAtivas.length} registro(s)</h2>
        </div>

        <SubscriptionList
          items={dashboard.assinaturasAtivas}
          emptyMessage="Nenhuma assinatura ativa encontrada."
          onSync={handleSync}
          onCancel={handleCancel}
          pendingActionId={pendingActionId}
        />
      </section>

      {isNewSubscriptionsModalOpen ? (
        <div
          className="subscription-management-modal-backdrop"
          role="presentation"
          onClick={() => setIsNewSubscriptionsModalOpen(false)}
        >
          <section
            className="subscription-management-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Novas assinaturas no mes atual"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="subscription-management-modal-header">
              <div>
                <p>Novas assinaturas</p>
                <h3>{referenceMonthLabel}</h3>
              </div>

              <button type="button" onClick={() => setIsNewSubscriptionsModalOpen(false)}>
                Fechar
              </button>
            </div>

            <SubscriptionList
              items={dashboard.novasAssinaturasMesAtual}
              emptyMessage="Nenhuma nova assinatura confirmada neste mes."
            />
          </section>
        </div>
      ) : null}
    </>
  );
}

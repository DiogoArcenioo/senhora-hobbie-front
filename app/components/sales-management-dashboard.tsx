"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";
import styles from "./sales-management-dashboard.module.css";

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

type VendaItem = {
  id: string;
  pagamentoId: string;
  produtoId: string;
  produtoNome: string;
  valor: string;
  moeda: string;
  statusEnvio: string;
  codigoRastreio: string | null;
  observacoes: string | null;
  dataPagamento: string | null;
  enviadoEm: string | null;
  entregueEm: string | null;
  createdAt: string;
  comprador: {
    id: string;
    nome: string;
    email: string | null;
  };
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
};

type VendasPayload = {
  resumo?: {
    totalVendasAprovadas?: unknown;
    vendasMesAtual?: unknown;
    mesReferencia?: unknown;
    receitaTotalAprovada?: unknown;
    pendentesEnvio?: unknown;
    enviadas?: unknown;
    entregues?: unknown;
  };
  vendas?: unknown;
  message?: unknown;
};

type DashboardData = {
  resumo: {
    totalVendasAprovadas: number;
    vendasMesAtual: number;
    mesReferencia: string;
    receitaTotalAprovada: string;
    pendentesEnvio: number;
    enviadas: number;
    entregues: number;
  };
  vendas: VendaItem[];
};

type StatusFilter = "TODOS" | "PENDENTE_ENVIO" | "ENVIADO" | "ENTREGUE";

const EMPTY_DASHBOARD: DashboardData = {
  resumo: {
    totalVendasAprovadas: 0,
    vendasMesAtual: 0,
    mesReferencia: "",
    receitaTotalAprovada: "0.00",
    pendentesEnvio: 0,
    enviadas: 0,
    entregues: 0,
  },
  vendas: [],
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
    return parsed && typeof parsed === "object" ? parsed : null;
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
    return payload && typeof payload === "object" ? payload : null;
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

function parseVendaItem(raw: unknown): VendaItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const pagamentoId = typeof value.pagamentoId === "string" ? value.pagamentoId.trim() : "";
  const produtoNome = typeof value.produtoNome === "string" ? value.produtoNome.trim() : "";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt.trim() : "";

  if (!id || !pagamentoId || !produtoNome || !createdAt) {
    return null;
  }

  const compradorRaw = value.comprador;
  if (!compradorRaw || typeof compradorRaw !== "object") {
    return null;
  }

  const comprador = compradorRaw as Record<string, unknown>;
  const compradorId = typeof comprador.id === "string" ? comprador.id.trim() : "";
  const compradorNome = typeof comprador.nome === "string" ? comprador.nome.trim() : "";

  if (!compradorId || !compradorNome) {
    return null;
  }

  const enderecoRaw = value.endereco;
  if (!enderecoRaw || typeof enderecoRaw !== "object") {
    return null;
  }

  const rawEndereco = enderecoRaw as Record<string, unknown>;
  const logradouro = typeof rawEndereco.logradouro === "string" ? rawEndereco.logradouro.trim() : "";
  const numero = typeof rawEndereco.numero === "string" ? rawEndereco.numero.trim() : "";
  const bairro = typeof rawEndereco.bairro === "string" ? rawEndereco.bairro.trim() : "";
  const cidade = typeof rawEndereco.cidade === "string" ? rawEndereco.cidade.trim() : "";
  const estado = typeof rawEndereco.estado === "string" ? rawEndereco.estado.trim() : "";
  const cep = typeof rawEndereco.cep === "string" ? rawEndereco.cep.trim() : "";

  if (!logradouro || !numero || !bairro || !cidade || !estado || !cep) {
    return null;
  }

  return {
    id,
    pagamentoId,
    produtoId: typeof value.produtoId === "string" && value.produtoId.trim() ? value.produtoId.trim() : "",
    produtoNome,
    valor: typeof value.valor === "string" && value.valor.trim() ? value.valor.trim() : "0.00",
    moeda: typeof value.moeda === "string" && value.moeda.trim() ? value.moeda.trim().toUpperCase() : "BRL",
    statusEnvio:
      typeof value.statusEnvio === "string" && value.statusEnvio.trim()
        ? value.statusEnvio.trim().toUpperCase()
        : "PENDENTE_ENVIO",
    codigoRastreio:
      typeof value.codigoRastreio === "string" && value.codigoRastreio.trim() ? value.codigoRastreio.trim() : null,
    observacoes:
      typeof value.observacoes === "string" && value.observacoes.trim() ? value.observacoes.trim() : null,
    dataPagamento:
      typeof value.dataPagamento === "string" && value.dataPagamento.trim() ? value.dataPagamento.trim() : null,
    enviadoEm:
      typeof value.enviadoEm === "string" && value.enviadoEm.trim() ? value.enviadoEm.trim() : null,
    entregueEm:
      typeof value.entregueEm === "string" && value.entregueEm.trim() ? value.entregueEm.trim() : null,
    createdAt,
    comprador: {
      id: compradorId,
      nome: compradorNome,
      email: typeof comprador.email === "string" && comprador.email.trim() ? comprador.email.trim() : null,
    },
    endereco: {
      logradouro,
      numero,
      complemento:
        typeof rawEndereco.complemento === "string" && rawEndereco.complemento.trim()
          ? rawEndereco.complemento.trim()
          : null,
      bairro,
      cidade,
      estado,
      cep,
    },
  };
}

function sanitizePayload(payload: VendasPayload | null): DashboardData {
  const vendasRaw = Array.isArray(payload?.vendas) ? payload?.vendas : [];
  const vendas = vendasRaw
    .map((item) => parseVendaItem(item))
    .filter((item): item is VendaItem => item !== null);

  const resumoRaw = payload?.resumo;
  const totalVendasAprovadas =
    typeof resumoRaw?.totalVendasAprovadas === "number" ? resumoRaw.totalVendasAprovadas : vendas.length;
  const vendasMesAtual = typeof resumoRaw?.vendasMesAtual === "number" ? resumoRaw.vendasMesAtual : 0;
  const mesReferencia =
    typeof resumoRaw?.mesReferencia === "string" && resumoRaw.mesReferencia.trim()
      ? resumoRaw.mesReferencia.trim()
      : "";
  const receitaTotalAprovada =
    typeof resumoRaw?.receitaTotalAprovada === "string" && resumoRaw.receitaTotalAprovada.trim()
      ? resumoRaw.receitaTotalAprovada.trim()
      : "0.00";
  const pendentesEnvio = typeof resumoRaw?.pendentesEnvio === "number" ? resumoRaw.pendentesEnvio : 0;
  const enviadas = typeof resumoRaw?.enviadas === "number" ? resumoRaw.enviadas : 0;
  const entregues = typeof resumoRaw?.entregues === "number" ? resumoRaw.entregues : 0;

  return {
    resumo: {
      totalVendasAprovadas,
      vendasMesAtual,
      mesReferencia,
      receitaTotalAprovada,
      pendentesEnvio,
      enviadas,
      entregues,
    },
    vendas,
  };
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

function formatAddress(address: VendaItem["endereco"]): string {
  const complemento = address.complemento ? `, ${address.complemento}` : "";
  return `${address.logradouro}, ${address.numero}${complemento} - ${address.bairro} - ${address.cidade}/${address.estado} - CEP ${address.cep}`;
}

function statusLabel(status: string): string {
  if (status === "ENVIADO") {
    return "Enviado";
  }

  if (status === "ENTREGUE") {
    return "Entregue";
  }

  return "Pendente envio";
}

function statusBadgeClassName(status: string): string {
  if (status === "ENVIADO") {
    return `${styles.statusBadge} ${styles.statusEnviado}`;
  }

  if (status === "ENTREGUE") {
    return `${styles.statusBadge} ${styles.statusEntregue}`;
  }

  return `${styles.statusBadge} ${styles.statusPendente}`;
}

type EnvioDialogProps = {
  venda: VendaItem;
  onClose: () => void;
  onConfirm: (vendaId: string, codigoRastreio: string, observacoes: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string;
};

function EnvioDialog({ venda, onClose, onConfirm, isSubmitting, errorMessage }: EnvioDialogProps) {
  const [codigoRastreio, setCodigoRastreio] = useState(venda.codigoRastreio ?? "");
  const [observacoes, setObservacoes] = useState(venda.observacoes ?? "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onConfirm(venda.id, codigoRastreio.trim(), observacoes.trim());
  };

  return (
    <div className={styles.dialogOverlay} role="dialog" aria-modal="true">
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <h3>Marcar como enviado</h3>
        <p className={styles.feedback}>
          Produto: <strong>{venda.produtoNome}</strong> &middot; Comprador: <strong>{venda.comprador.nome}</strong>
        </p>

        <label>
          Codigo de rastreio (opcional)
          <input
            type="text"
            value={codigoRastreio}
            onChange={(event) => setCodigoRastreio(event.target.value)}
            placeholder="Ex: BR1234567890"
            autoFocus
          />
        </label>

        <label>
          Observacoes (opcional)
          <textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Ex: Enviado via Correios PAC"
          />
        </label>

        {errorMessage ? <p className={`${styles.feedback} ${styles.feedbackError}`}>{errorMessage}</p> : null}

        <div className={styles.dialogActions}>
          <button type="button" className="btn btn-soft" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Confirmar envio"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SalesManagementDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [envioVenda, setEnvioVenda] = useState<VendaItem | null>(null);
  const [isSubmittingEnvio, setIsSubmittingEnvio] = useState(false);
  const [envioErrorMessage, setEnvioErrorMessage] = useState("");
  const [entregaVendaId, setEntregaVendaId] = useState<string | null>(null);

  const syncAdminAccess = useCallback(() => {
    const authUser = readAuthUser();
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const tokenPayload = decodeJwtPayload(token);

    const adminFromStorage = isAdminUser(authUser);
    const adminFromToken =
      typeof tokenPayload?.tipo === "string" && tokenPayload.tipo.trim().toUpperCase() === "ADM";

    setIsAdmin(adminFromStorage || adminFromToken);
  }, []);

  const loadDashboard = useCallback(async (filter: StatusFilter) => {
    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setErrorMessage("Faca login como ADM para acessar a area de vendas.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const query = filter === "TODOS" ? "" : `?statusEnvio=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/admin/vendas${query}`, {
        method: "GET",
        headers: { Authorization: authorizationHeader },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as VendasPayload | null;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar a area de vendas."));
      }

      setDashboard(sanitizePayload(payload));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao carregar a area de vendas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncAdminAccess();
    void loadDashboard(statusFilter);

    window.addEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
    window.addEventListener("storage", syncAdminAccess);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
      window.removeEventListener("storage", syncAdminAccess);
    };
  }, [loadDashboard, statusFilter, syncAdminAccess]);

  const referenceMonthLabel = useMemo(
    () => formatReferenceMonth(dashboard.resumo.mesReferencia),
    [dashboard.resumo.mesReferencia],
  );

  const handleMarcarEnviado = async (vendaId: string, codigoRastreio: string, observacoes: string) => {
    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setEnvioErrorMessage("Sessao expirada. Faca login novamente.");
      return;
    }

    setIsSubmittingEnvio(true);
    setEnvioErrorMessage("");

    try {
      const response = await fetch(`/api/admin/vendas/${encodeURIComponent(vendaId)}/enviar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify({
          codigoRastreio: codigoRastreio || null,
          observacoes: observacoes || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel marcar a venda como enviada."));
      }

      setEnvioVenda(null);
      await loadDashboard(statusFilter);
    } catch (error) {
      setEnvioErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao marcar venda como enviada.",
      );
    } finally {
      setIsSubmittingEnvio(false);
    }
  };

  const handleMarcarEntregue = async (vendaId: string) => {
    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setErrorMessage("Sessao expirada. Faca login novamente.");
      return;
    }

    setEntregaVendaId(vendaId);

    try {
      const response = await fetch(`/api/admin/vendas/${encodeURIComponent(vendaId)}/entregar`, {
        method: "PATCH",
        headers: { Authorization: authorizationHeader },
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel marcar a venda como entregue."));
      }

      await loadDashboard(statusFilter);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao marcar venda como entregue.",
      );
    } finally {
      setEntregaVendaId(null);
    }
  };

  if (!isAdmin) {
    return (
      <section className={`${styles.panel} reveal reveal-1`}>
        <p className={styles.kicker}>Vendas</p>
        <h1>Acesso restrito</h1>
        <p className={styles.feedback}>Esta area e exclusiva para administradoras.</p>
      </section>
    );
  }

  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: "TODOS", label: "Todos" },
    { id: "PENDENTE_ENVIO", label: `Pendentes envio (${dashboard.resumo.pendentesEnvio})` },
    { id: "ENVIADO", label: `Enviadas (${dashboard.resumo.enviadas})` },
    { id: "ENTREGUE", label: `Entregues (${dashboard.resumo.entregues})` },
  ];

  return (
    <>
      <section className={`${styles.panel} reveal reveal-1`}>
        <p className={styles.kicker}>Vendas</p>
        <h1>Gestao de vendas de produtos</h1>
        <p className={styles.description}>
          Lista de compras aprovadas com comprador, produto, endereco e status de envio. Acompanhe os pedidos pendentes de envio.
        </p>

        <div className={styles.cards}>
          <article className={styles.card}>
            <span>Total de vendas</span>
            <strong>{dashboard.resumo.totalVendasAprovadas}</strong>
            <small>Pagamentos aprovados</small>
          </article>

          <article className={styles.card}>
            <span>Vendas em {referenceMonthLabel}</span>
            <strong>{dashboard.resumo.vendasMesAtual}</strong>
            <small>Mes atual</small>
          </article>

          <article className={styles.card}>
            <span>Receita aprovada</span>
            <strong>{formatCurrency(dashboard.resumo.receitaTotalAprovada, "BRL")}</strong>
            <small>Soma das vendas aprovadas</small>
          </article>

          <article className={styles.card}>
            <span>Pendentes de envio</span>
            <strong>{dashboard.resumo.pendentesEnvio}</strong>
            <small>Precisam ser enviadas</small>
          </article>

          <article className={styles.card}>
            <span>Enviadas</span>
            <strong>{dashboard.resumo.enviadas}</strong>
            <small>Aguardando entrega</small>
          </article>

          <article className={styles.card}>
            <span>Entregues</span>
            <strong>{dashboard.resumo.entregues}</strong>
            <small>Confirmadas</small>
          </article>
        </div>
      </section>

      <section className={`${styles.listPanel} reveal reveal-2`}>
        <div className={styles.listHeader}>
          <p>Vendas registradas</p>
          <h2>{dashboard.vendas.length} registro(s)</h2>
        </div>

        <div className={styles.filters}>
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`${styles.filterButton} ${statusFilter === filter.id ? styles.filterActive : ""}`}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {errorMessage ? <p className={`${styles.feedback} ${styles.feedbackError}`}>{errorMessage}</p> : null}

        {isLoading ? (
          <p className={styles.feedback}>Carregando vendas...</p>
        ) : dashboard.vendas.length === 0 ? (
          <p className={styles.empty}>Nenhuma venda encontrada para o filtro selecionado.</p>
        ) : (
          <ul className={styles.list}>
            {dashboard.vendas.map((venda) => (
              <li key={venda.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <strong>{venda.comprador.nome}</strong>
                  <span className={statusBadgeClassName(venda.statusEnvio)}>{statusLabel(venda.statusEnvio)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>{venda.comprador.email ?? "Email nao informado"}</span>
                  <span>{formatCurrency(venda.valor, venda.moeda)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Produto: {venda.produtoNome}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Endereco: {formatAddress(venda.endereco)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Pagamento ID: {venda.pagamentoId}</span>
                  <span>Data pagamento: {formatDateTime(venda.dataPagamento ?? venda.createdAt)}</span>
                </div>

                {venda.codigoRastreio ? (
                  <div className={styles.itemRow}>
                    <span>Rastreio: <strong>{venda.codigoRastreio}</strong></span>
                    <span>Enviado em: {formatDateTime(venda.enviadoEm)}</span>
                  </div>
                ) : null}

                {venda.observacoes ? (
                  <div className={styles.itemRow}>
                    <span>Observacoes: {venda.observacoes}</span>
                  </div>
                ) : null}

                {venda.entregueEm ? (
                  <div className={styles.itemRow}>
                    <span>Entregue em: {formatDateTime(venda.entregueEm)}</span>
                  </div>
                ) : null}

                <div className={styles.itemActions}>
                  {venda.statusEnvio === "PENDENTE_ENVIO" ? (
                    <button type="button" className="btn btn-primary" onClick={() => {
                      setEnvioErrorMessage("");
                      setEnvioVenda(venda);
                    }}>
                      Marcar como enviado
                    </button>
                  ) : null}

                  {venda.statusEnvio === "ENVIADO" ? (
                    <button
                      type="button"
                      className="btn btn-soft"
                      onClick={() => handleMarcarEntregue(venda.id)}
                      disabled={entregaVendaId === venda.id}
                    >
                      {entregaVendaId === venda.id ? "Confirmando..." : "Marcar como entregue"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {envioVenda ? (
        <EnvioDialog
          venda={envioVenda}
          onClose={() => {
            setEnvioVenda(null);
            setEnvioErrorMessage("");
          }}
          onConfirm={handleMarcarEnviado}
          isSubmitting={isSubmittingEnvio}
          errorMessage={envioErrorMessage}
        />
      ) : null}
    </>
  );
}

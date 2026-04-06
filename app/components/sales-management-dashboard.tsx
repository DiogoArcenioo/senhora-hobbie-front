"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  pagamentoId: string;
  valor: string | null;
  moeda: string | null;
  dataPagamento: string | null;
  createdAt: string;
  produtoId: string | null;
  produtoNome: string;
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
  } | null;
};

type VendasPayload = {
  resumo?: {
    totalVendasAprovadas?: unknown;
    vendasMesAtual?: unknown;
    mesReferencia?: unknown;
    receitaTotalAprovada?: unknown;
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
  };
  vendas: VendaItem[];
};

const EMPTY_DASHBOARD: DashboardData = {
  resumo: {
    totalVendasAprovadas: 0,
    vendasMesAtual: 0,
    mesReferencia: "",
    receitaTotalAprovada: "0.00",
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

function parseVendaItem(raw: unknown): VendaItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const pagamentoId = typeof value.pagamentoId === "string" ? value.pagamentoId.trim() : "";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt.trim() : "";
  const produtoNome = typeof value.produtoNome === "string" ? value.produtoNome.trim() : "";

  if (!pagamentoId || !createdAt || !produtoNome) {
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
  let endereco: VendaItem["endereco"] = null;

  if (enderecoRaw && typeof enderecoRaw === "object") {
    const rawEndereco = enderecoRaw as Record<string, unknown>;
    const logradouro = typeof rawEndereco.logradouro === "string" ? rawEndereco.logradouro.trim() : "";
    const numero = typeof rawEndereco.numero === "string" ? rawEndereco.numero.trim() : "";
    const bairro = typeof rawEndereco.bairro === "string" ? rawEndereco.bairro.trim() : "";
    const cidade = typeof rawEndereco.cidade === "string" ? rawEndereco.cidade.trim() : "";
    const estado = typeof rawEndereco.estado === "string" ? rawEndereco.estado.trim() : "";
    const cep = typeof rawEndereco.cep === "string" ? rawEndereco.cep.trim() : "";

    if (logradouro && numero && bairro && cidade && estado && cep) {
      endereco = {
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
      };
    }
  }

  return {
    pagamentoId,
    valor: typeof value.valor === "string" && value.valor.trim() ? value.valor.trim() : null,
    moeda: typeof value.moeda === "string" && value.moeda.trim() ? value.moeda.trim().toUpperCase() : null,
    dataPagamento:
      typeof value.dataPagamento === "string" && value.dataPagamento.trim() ? value.dataPagamento.trim() : null,
    createdAt,
    produtoId: typeof value.produtoId === "string" && value.produtoId.trim() ? value.produtoId.trim() : null,
    produtoNome,
    comprador: {
      id: compradorId,
      nome: compradorNome,
      email: typeof comprador.email === "string" && comprador.email.trim() ? comprador.email.trim() : null,
    },
    endereco,
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

  return {
    resumo: {
      totalVendasAprovadas,
      vendasMesAtual,
      mesReferencia,
      receitaTotalAprovada,
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
  if (!address) {
    return "Endereco nao cadastrado";
  }

  const complemento = address.complemento ? `, ${address.complemento}` : "";
  return `${address.logradouro}, ${address.numero}${complemento} - ${address.bairro} - ${address.cidade}/${address.estado} - CEP ${address.cep}`;
}

export default function SalesManagementDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage("Faca login como ADM para acessar a area de vendas.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/vendas", {
        method: "GET",
        headers: {
          Authorization: authorizationHeader,
        },
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
    void loadDashboard();

    window.addEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
    window.addEventListener("storage", syncAdminAccess);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
      window.removeEventListener("storage", syncAdminAccess);
    };
  }, [loadDashboard, syncAdminAccess]);

  const referenceMonthLabel = useMemo(
    () => formatReferenceMonth(dashboard.resumo.mesReferencia),
    [dashboard.resumo.mesReferencia],
  );

  if (!isAdmin) {
    return (
      <section className={`${styles.panel} reveal reveal-1`}>
        <p className={styles.kicker}>Vendas</p>
        <h1>Acesso restrito</h1>
        <p className={styles.feedback}>Esta area e exclusiva para administradoras.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={`${styles.panel} reveal reveal-1`}>
        <p className={styles.kicker}>Vendas</p>
        <h1>Relatorio de vendas</h1>
        <p className={styles.feedback}>Carregando dados...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={`${styles.panel} reveal reveal-1`}>
        <p className={styles.kicker}>Vendas</p>
        <h1>Relatorio de vendas</h1>
        <p className={`${styles.feedback} ${styles.feedbackError}`}>{errorMessage}</p>
      </section>
    );
  }

  return (
    <>
      <section className={`${styles.panel} reveal reveal-1`}>
        <p className={styles.kicker}>Vendas</p>
        <h1>Relatorio de vendas de produtos</h1>
        <p className={styles.description}>
          Lista de compras aprovadas com comprador, produto e endereco para entrega.
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
        </div>
      </section>

      <section className={`${styles.listPanel} reveal reveal-2`}>
        <div className={styles.listHeader}>
          <p>Vendas registradas</p>
          <h2>{dashboard.vendas.length} registro(s)</h2>
        </div>

        {dashboard.vendas.length === 0 ? (
          <p className={styles.empty}>Nenhuma venda aprovada encontrada.</p>
        ) : (
          <ul className={styles.list}>
            {dashboard.vendas.map((venda) => (
              <li key={venda.pagamentoId} className={styles.item}>
                <div className={styles.itemRow}>
                  <strong>{venda.comprador.nome}</strong>
                  <span>{venda.comprador.email ?? "Email nao informado"}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Produto: {venda.produtoNome}</span>
                  <span>{formatCurrency(venda.valor, venda.moeda)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Endereco: {formatAddress(venda.endereco)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Pagamento ID: {venda.pagamentoId}</span>
                  <span>
                    Data: {formatDateTime(venda.dataPagamento ?? venda.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

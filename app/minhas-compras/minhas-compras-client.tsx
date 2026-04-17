"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  getAuthSessionAuthorizationHeader,
  hasAuthSessionToken,
} from "@/app/lib/auth-session";
import styles from "./page.module.css";

type EnderecoForm = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
};

type CompraItem = {
  id: string;
  pagamentoId: string;
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

const EMPTY_ENDERECO: EnderecoForm = {
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
};

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

function toFormString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseEndereco(payload: unknown): EnderecoForm {
  if (!payload || typeof payload !== "object") {
    return { ...EMPTY_ENDERECO };
  }

  const raw = payload as Record<string, unknown>;
  return {
    logradouro: toFormString(raw.logradouro),
    numero: toFormString(raw.numero),
    complemento: toFormString(raw.complemento),
    bairro: toFormString(raw.bairro),
    cidade: toFormString(raw.cidade),
    estado: toFormString(raw.estado),
    cep: toFormString(raw.cep),
  };
}

function parseCompra(raw: unknown): CompraItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = toFormString(value.id);
  const pagamentoId = toFormString(value.pagamentoId);
  const produtoNome = toFormString(value.produtoNome);
  const createdAt = toFormString(value.createdAt);

  if (!id || !pagamentoId || !produtoNome || !createdAt) {
    return null;
  }

  const enderecoRaw = value.endereco;
  if (!enderecoRaw || typeof enderecoRaw !== "object") {
    return null;
  }

  const rawEndereco = enderecoRaw as Record<string, unknown>;

  return {
    id,
    pagamentoId,
    produtoNome,
    valor: toFormString(value.valor) || "0.00",
    moeda: (toFormString(value.moeda) || "BRL").toUpperCase(),
    statusEnvio: (toFormString(value.statusEnvio) || "PENDENTE_ENVIO").toUpperCase(),
    codigoRastreio: toFormString(value.codigoRastreio) || null,
    observacoes: toFormString(value.observacoes) || null,
    dataPagamento: toFormString(value.dataPagamento) || null,
    enviadoEm: toFormString(value.enviadoEm) || null,
    entregueEm: toFormString(value.entregueEm) || null,
    createdAt,
    endereco: {
      logradouro: toFormString(rawEndereco.logradouro),
      numero: toFormString(rawEndereco.numero),
      complemento: toFormString(rawEndereco.complemento) || null,
      bairro: toFormString(rawEndereco.bairro),
      cidade: toFormString(rawEndereco.cidade),
      estado: toFormString(rawEndereco.estado),
      cep: toFormString(rawEndereco.cep),
    },
  };
}

function formatCurrency(value: string, currencyCode: string): string {
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

function formatAddress(address: CompraItem["endereco"]): string {
  const complemento = address.complemento ? `, ${address.complemento}` : "";
  return `${address.logradouro}, ${address.numero}${complemento} - ${address.bairro} - ${address.cidade}/${address.estado} - CEP ${address.cep}`;
}

function isEnderecoComplete(endereco: EnderecoForm): boolean {
  return Boolean(
    endereco.logradouro.trim() &&
      endereco.numero.trim() &&
      endereco.bairro.trim() &&
      endereco.cidade.trim() &&
      endereco.estado.trim() &&
      endereco.cep.trim(),
  );
}

export default function MinhasComprasClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [endereco, setEndereco] = useState<EnderecoForm>(EMPTY_ENDERECO);
  const [isLoadingEndereco, setIsLoadingEndereco] = useState(true);
  const [enderecoError, setEnderecoError] = useState("");
  const [enderecoSuccess, setEnderecoSuccess] = useState("");
  const [isSavingEndereco, setIsSavingEndereco] = useState(false);
  const [compras, setCompras] = useState<CompraItem[]>([]);
  const [isLoadingCompras, setIsLoadingCompras] = useState(true);
  const [comprasError, setComprasError] = useState("");

  const syncSession = useCallback(() => {
    setIsLoggedIn(hasAuthSessionToken());
  }, []);

  const loadEndereco = useCallback(async () => {
    const authorizationHeader = getAuthSessionAuthorizationHeader();

    if (!authorizationHeader) {
      setEnderecoError("Faca login para gerenciar seu endereco.");
      setIsLoadingEndereco(false);
      return;
    }

    setIsLoadingEndereco(true);

    try {
      const response = await fetch("/api/usuarios/me/endereco", {
        method: "GET",
        headers: { Authorization: authorizationHeader },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (response.status === 404) {
        setEndereco({ ...EMPTY_ENDERECO });
        setEnderecoError("");
        return;
      }

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar o endereco."));
      }

      setEndereco(parseEndereco(payload));
      setEnderecoError("");
    } catch (error) {
      setEnderecoError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao carregar endereco.",
      );
    } finally {
      setIsLoadingEndereco(false);
    }
  }, []);

  const loadCompras = useCallback(async () => {
    const authorizationHeader = getAuthSessionAuthorizationHeader();

    if (!authorizationHeader) {
      setComprasError("Faca login para ver suas compras.");
      setIsLoadingCompras(false);
      return;
    }

    setIsLoadingCompras(true);

    try {
      const response = await fetch("/api/usuarios/me/compras", {
        method: "GET",
        headers: { Authorization: authorizationHeader },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar suas compras."));
      }

      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { vendas?: unknown })?.vendas)
          ? ((payload as { vendas: unknown[] }).vendas as unknown[])
          : [];

      const parsed = rawList
        .map((item) => parseCompra(item))
        .filter((item): item is CompraItem => item !== null);

      setCompras(parsed);
      setComprasError("");
    } catch (error) {
      setComprasError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao carregar suas compras.",
      );
    } finally {
      setIsLoadingCompras(false);
    }
  }, []);

  useEffect(() => {
    syncSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [syncSession]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoadingEndereco(false);
      setIsLoadingCompras(false);
      return;
    }

    void loadEndereco();
    void loadCompras();
  }, [isLoggedIn, loadCompras, loadEndereco]);

  const handleEnderecoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authorizationHeader = getAuthSessionAuthorizationHeader();

    if (!authorizationHeader) {
      setEnderecoError("Sessao expirada. Faca login novamente.");
      return;
    }

    if (!isEnderecoComplete(endereco)) {
      setEnderecoError("Preencha logradouro, numero, bairro, cidade, estado e CEP.");
      return;
    }

    setIsSavingEndereco(true);
    setEnderecoError("");
    setEnderecoSuccess("");

    try {
      const response = await fetch("/api/usuarios/me/endereco", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify({
          logradouro: endereco.logradouro.trim(),
          numero: endereco.numero.trim(),
          complemento: endereco.complemento.trim() || null,
          bairro: endereco.bairro.trim(),
          cidade: endereco.cidade.trim(),
          estado: endereco.estado.trim().toUpperCase(),
          cep: endereco.cep.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel salvar o endereco."));
      }

      setEndereco(parseEndereco(payload));
      setEnderecoSuccess("Endereco atualizado com sucesso.");
    } catch (error) {
      setEnderecoError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao salvar o endereco.",
      );
    } finally {
      setIsSavingEndereco(false);
    }
  };

  const updateField = (field: keyof EnderecoForm, value: string) => {
    setEndereco((previous) => ({ ...previous, [field]: value }));
    setEnderecoSuccess("");
  };

  if (!isLoggedIn) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p>Minhas compras</p>
          <h2>Acesso restrito</h2>
        </div>
        <p className={styles.feedback}>Faca login para visualizar suas compras e atualizar o endereco de entrega.</p>
        <div className={styles.formActions}>
          <Link href="/" className="btn btn-primary">
            Voltar para inicio
          </Link>
        </div>
      </section>
    );
  }

  const enderecoCompleto = isEnderecoComplete(endereco);

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p>Endereco de entrega</p>
          <h2>Onde enviamos seus pedidos</h2>
        </div>

        {!enderecoCompleto && !isLoadingEndereco ? (
          <p className={styles.feedbackWarning}>
            Cadastre seu endereco de entrega antes de comprar um produto. Sem endereco completo nao e possivel finalizar a
            compra.
          </p>
        ) : null}

        {isLoadingEndereco ? (
          <p className={styles.feedback}>Carregando endereco...</p>
        ) : (
          <form className={styles.form} onSubmit={handleEnderecoSubmit}>
            <label className={styles.fullRow}>
              Logradouro
              <input
                type="text"
                value={endereco.logradouro}
                onChange={(event) => updateField("logradouro", event.target.value)}
                placeholder="Rua / Avenida"
                required
              />
            </label>

            <label>
              Numero
              <input
                type="text"
                value={endereco.numero}
                onChange={(event) => updateField("numero", event.target.value)}
                required
              />
            </label>

            <label>
              Complemento
              <input
                type="text"
                value={endereco.complemento}
                onChange={(event) => updateField("complemento", event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <label>
              Bairro
              <input
                type="text"
                value={endereco.bairro}
                onChange={(event) => updateField("bairro", event.target.value)}
                required
              />
            </label>

            <label>
              Cidade
              <input
                type="text"
                value={endereco.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
                required
              />
            </label>

            <label>
              Estado (UF)
              <input
                type="text"
                value={endereco.estado}
                maxLength={2}
                onChange={(event) => updateField("estado", event.target.value.toUpperCase())}
                required
              />
            </label>

            <label>
              CEP
              <input
                type="text"
                value={endereco.cep}
                onChange={(event) => updateField("cep", event.target.value)}
                placeholder="00000-000"
                required
              />
            </label>

            {enderecoError ? <p className={`${styles.fullRow} ${styles.feedbackError}`}>{enderecoError}</p> : null}
            {enderecoSuccess ? <p className={`${styles.fullRow} ${styles.feedbackSuccess}`}>{enderecoSuccess}</p> : null}

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary" disabled={isSavingEndereco}>
                {isSavingEndereco ? "Salvando..." : "Salvar endereco"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p>Minhas compras</p>
          <h2>{compras.length} pedido(s)</h2>
        </div>

        {comprasError ? <p className={styles.feedbackError}>{comprasError}</p> : null}

        {isLoadingCompras ? (
          <p className={styles.feedback}>Carregando suas compras...</p>
        ) : compras.length === 0 ? (
          <p className={styles.empty}>Voce ainda nao possui compras aprovadas.</p>
        ) : (
          <ul className={styles.list}>
            {compras.map((compra) => (
              <li key={compra.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <strong>{compra.produtoNome}</strong>
                  <span className={statusBadgeClassName(compra.statusEnvio)}>{statusLabel(compra.statusEnvio)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Valor: {formatCurrency(compra.valor, compra.moeda)}</span>
                  <span>Pago em: {formatDateTime(compra.dataPagamento ?? compra.createdAt)}</span>
                </div>

                <div className={styles.itemRow}>
                  <span>Endereco de entrega: {formatAddress(compra.endereco)}</span>
                </div>

                {compra.codigoRastreio ? (
                  <div className={styles.itemRow}>
                    <span>Rastreio: <strong>{compra.codigoRastreio}</strong></span>
                    <span>Enviado em: {formatDateTime(compra.enviadoEm)}</span>
                  </div>
                ) : null}

                {compra.observacoes ? (
                  <div className={styles.itemRow}>
                    <span>Observacoes: {compra.observacoes}</span>
                  </div>
                ) : null}

                {compra.entregueEm ? (
                  <div className={styles.itemRow}>
                    <span>Entregue em: {formatDateTime(compra.entregueEm)}</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

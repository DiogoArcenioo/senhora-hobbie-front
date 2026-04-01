"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/assinatura/page.module.css";
import { TOKEN_STORAGE_KEY, TOKEN_TYPE_STORAGE_KEY } from "@/app/lib/auth-session";

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

type ApiErrorPayload = {
  message?: string | string[];
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

export default function SubscriptionPlans() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadPlanos = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
      const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

      if (!token) {
        setErrorMessage("Faca login para visualizar os planos.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/planos", {
          method: "GET",
          headers: {
            Authorization: `${tokenType} ${token}`,
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

        if (!isCancelled) {
          setPlanos(payload as Plano[]);
          setErrorMessage("");
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Erro inesperado ao carregar os planos.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPlanos();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return <div className={styles.statePanel}>Carregando planos...</div>;
  }

  if (errorMessage) {
    return <div className={styles.statePanel}>{errorMessage}</div>;
  }

  if (planos.length === 0) {
    return <div className={styles.statePanel}>Nenhum plano cadastrado na tabela public.planos.</div>;
  }

  return (
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
          {plano.ativo ? (
            <Link href={`/assinatura/checkout?planoId=${encodeURIComponent(plano.id)}`} className={`btn btn-primary ${styles.planAction}`}>
              Assinar
            </Link>
          ) : (
            <span className={styles.planInactiveLabel}>Plano indisponivel</span>
          )}
        </article>
      ))}
    </section>
  );
}

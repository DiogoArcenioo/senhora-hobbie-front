"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOKEN_STORAGE_KEY, TOKEN_TYPE_STORAGE_KEY } from "@/app/lib/auth-session";
import styles from "./page.module.css";

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

type CheckoutPayload = {
  checkout_url?: string;
  preference_id?: string | null;
  message?: string | string[];
};

type CheckoutClientProps = {
  planoId: string;
};

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const { message } = payload as CheckoutPayload;

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

export default function CheckoutClient({ planoId }: CheckoutClientProps) {
  const [plano, setPlano] = useState<Plano | null>(null);
  const [isLoadingPlano, setIsLoadingPlano] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadPlano = async () => {
      if (!planoId) {
        setErrorMessage("Plano nao informado para checkout.");
        setIsLoadingPlano(false);
        return;
      }

      const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
      const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

      if (!token) {
        setErrorMessage("Faca login para continuar com a assinatura.");
        setIsLoadingPlano(false);
        return;
      }

      try {
        const response = await fetch(`/api/planos/${encodeURIComponent(planoId)}`, {
          method: "GET",
          headers: {
            Authorization: `${tokenType} ${token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar o plano selecionado."));
        }

        if (!payload || typeof payload !== "object") {
          throw new Error("Resposta invalida ao carregar plano.");
        }

        if (!isCancelled) {
          setPlano(payload as Plano);
          setErrorMessage("");
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Erro inesperado ao carregar o plano.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPlano(false);
        }
      }
    };

    void loadPlano();

    return () => {
      isCancelled = true;
    };
  }, [planoId]);

  const handleCheckout = async () => {
    if (!plano || isCreatingCheckout) {
      return;
    }

    if (!plano.ativo) {
      setErrorMessage("Este plano esta inativo e nao pode ser assinado.");
      return;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
    const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

    if (!token) {
      setErrorMessage("Faca login para continuar com a assinatura.");
      return;
    }

    setIsCreatingCheckout(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/pagamentos/assinaturas/plano-associado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${tokenType} ${token}`,
        },
        body: JSON.stringify({ planoId: plano.id }),
      });

      const payload = (await response.json().catch(() => null)) as CheckoutPayload | null;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel iniciar assinatura no Mercado Pago."));
      }

      const checkoutUrl = typeof payload?.checkout_url === "string" ? payload.checkout_url : "";

      if (!checkoutUrl) {
        throw new Error("URL de autorizacao nao retornada pelo Mercado Pago.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao iniciar assinatura.",
      );
      setIsCreatingCheckout(false);
    }
  };

  if (isLoadingPlano) {
    return <div className={styles.panel}>Carregando plano para checkout...</div>;
  }

  if (errorMessage && !plano) {
    return (
      <div className={styles.panel}>
        <p className={styles.error}>{errorMessage}</p>
        <Link href="/assinatura" className="btn btn-soft">
          Voltar para planos
        </Link>
      </div>
    );
  }

  if (!plano) {
    return (
      <div className={styles.panel}>
        <p className={styles.error}>Plano nao encontrado.</p>
        <Link href="/assinatura" className="btn btn-soft">
          Voltar para planos
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.panel}>
      <small className={styles.badge}>{plano.tipo}</small>
      <h2>{plano.nome}</h2>
      <strong className={styles.price}>{formatCurrency(plano.valor, plano.moeda)}</strong>
      <p>{plano.descricao?.trim() ? plano.descricao : "Sem descricao cadastrada para este plano."}</p>
      <ul className={styles.infoList}>
        <li>Periodicidade: {formatPeriodicidade(plano.periodicidade_cobranca)}</li>
        <li>Duracao: {formatDuracao(plano)}</li>
        <li>Status: {plano.ativo ? "Ativo" : "Inativo"}</li>
      </ul>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.actions}>
        <Link href="/assinatura" className="btn btn-soft">
          Voltar para planos
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCheckout}
          disabled={isCreatingCheckout || !plano.ativo}
        >
          {isCreatingCheckout ? "Redirecionando..." : "Assinar com Mercado Pago"}
        </button>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOKEN_STORAGE_KEY, TOKEN_TYPE_STORAGE_KEY } from "@/app/lib/auth-session";
import styles from "./page.module.css";

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  moeda: string;
  capaUrl: string | null;
  ativo: boolean;
};

type CheckoutPayload = {
  checkout_url?: string;
  preference_id?: string | null;
  message?: string | string[];
};

type CheckoutClientProps = {
  produtoId: string;
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

function normalizeProduto(payload: unknown): Produto | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";
  const preco = typeof raw.preco === "string" ? raw.preco.trim() : "";

  if (!id || !nome || !preco) {
    return null;
  }

  return {
    id,
    nome,
    descricao: typeof raw.descricao === "string" && raw.descricao.trim() ? raw.descricao.trim() : null,
    preco,
    moeda: typeof raw.moeda === "string" && raw.moeda.trim() ? raw.moeda.trim().toUpperCase() : "BRL",
    capaUrl: typeof raw.capaUrl === "string" && raw.capaUrl.trim() ? raw.capaUrl.trim() : null,
    ativo: typeof raw.ativo === "boolean" ? raw.ativo : true,
  };
}

export default function CheckoutClient({ produtoId }: CheckoutClientProps) {
  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoadingProduto, setIsLoadingProduto] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadProduto = async () => {
      if (!produtoId) {
        setErrorMessage("Produto nao informado para checkout.");
        setIsLoadingProduto(false);
        return;
      }

      try {
        const response = await fetch(`/api/produtos/${encodeURIComponent(produtoId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar o produto selecionado."));
        }

        const normalizedProduto = normalizeProduto(payload);

        if (!normalizedProduto) {
          throw new Error("Resposta invalida ao carregar produto.");
        }

        if (!isCancelled) {
          setProduto(normalizedProduto);
          setErrorMessage("");
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Erro inesperado ao carregar o produto.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProduto(false);
        }
      }
    };

    void loadProduto();

    return () => {
      isCancelled = true;
    };
  }, [produtoId]);

  const handleCheckout = async () => {
    if (!produto || isCreatingCheckout) {
      return;
    }

    if (!produto.ativo) {
      setErrorMessage("Este produto esta inativo e nao pode ser vendido.");
      return;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
    const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

    if (!token) {
      setErrorMessage("Faca login para continuar com a compra.");
      return;
    }

    setIsCreatingCheckout(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/pagamentos/produtos/checkout-pro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${tokenType} ${token}`,
        },
        body: JSON.stringify({ produtoId: produto.id }),
      });

      const payload = (await response.json().catch(() => null)) as CheckoutPayload | null;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel iniciar checkout do produto no Mercado Pago."));
      }

      const checkoutUrl = typeof payload?.checkout_url === "string" ? payload.checkout_url : "";

      if (!checkoutUrl) {
        throw new Error("URL de checkout nao retornada pelo Mercado Pago.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao iniciar checkout do produto.",
      );
      setIsCreatingCheckout(false);
    }
  };

  if (isLoadingProduto) {
    return <div className={styles.panel}>Carregando produto para checkout...</div>;
  }

  if (errorMessage && !produto) {
    return (
      <div className={styles.panel}>
        <p className={styles.error}>{errorMessage}</p>
        <Link href="/produtos" className="btn btn-soft">
          Voltar para produtos
        </Link>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className={styles.panel}>
        <p className={styles.error}>Produto nao encontrado.</p>
        <Link href="/produtos" className="btn btn-soft">
          Voltar para produtos
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.panel}>
      {produto.capaUrl ? (
        <div className={styles.cover}>
          <img src={produto.capaUrl} alt={`Capa do produto ${produto.nome}`} />
        </div>
      ) : null}

      <small className={styles.badge}>Produto avulso</small>
      <h2>{produto.nome}</h2>
      <strong className={styles.price}>{formatCurrency(produto.preco, produto.moeda)}</strong>
      <p>{produto.descricao?.trim() ? produto.descricao : "Sem descricao cadastrada para este produto."}</p>
      <ul className={styles.infoList}>
        <li>Status: {produto.ativo ? "Ativo" : "Inativo"}</li>
        <li>Pagamento: Mercado Pago</li>
      </ul>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.actions}>
        <Link href="/produtos" className="btn btn-soft">
          Voltar para produtos
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCheckout}
          disabled={isCreatingCheckout || !produto.ativo}
        >
          {isCreatingCheckout ? "Redirecionando..." : "Pagar com Mercado Pago"}
        </button>
      </div>
    </section>
  );
}

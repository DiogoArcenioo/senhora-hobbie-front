import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import CheckoutResultSync from "./checkout-result-sync";
import styles from "./page.module.css";

type CheckoutStatus = "success" | "pending" | "failure" | "unknown";

type CheckoutResultPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    payment_id?: string | string[];
    collection_id?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
    return typeof first === "string" ? first.trim() : null;
  }

  return null;
}

function resolveStatus(statusParam: string | null): CheckoutStatus {
  if (statusParam === "success" || statusParam === "pending" || statusParam === "failure") {
    return statusParam;
  }

  return "unknown";
}

function resolveStatusText(status: CheckoutStatus): { title: string; description: string; tone: "ok" | "warn" | "error" } {
  if (status === "success") {
    return {
      title: "Pagamento aprovado",
      description: "Seu pedido foi confirmado com sucesso pelo Mercado Pago.",
      tone: "ok",
    };
  }

  if (status === "pending") {
    return {
      title: "Pagamento pendente",
      description: "Recebemos sua solicitacao. O Mercado Pago ainda esta processando o pagamento.",
      tone: "warn",
    };
  }

  if (status === "failure") {
    return {
      title: "Pagamento nao concluido",
      description: "O pagamento foi recusado ou cancelado. Voce pode tentar novamente.",
      tone: "error",
    };
  }

  return {
    title: "Status de pagamento indisponivel",
    description: "Nao foi possivel identificar o resultado do checkout.",
    tone: "warn",
  };
}

export default async function ProdutoCheckoutResultPage({ searchParams }: CheckoutResultPageProps) {
  const resolvedSearchParams = await searchParams;
  const statusParam = resolvedSearchParams.status;
  const status = resolveStatus((Array.isArray(statusParam) ? statusParam[0] : statusParam ?? null));
  const statusInfo = resolveStatusText(status);
  const paymentId =
    firstParam(resolvedSearchParams.payment_id) ??
    firstParam(resolvedSearchParams.collection_id);

  return (
    <div className={styles.page}>
      <div className="home-noise" aria-hidden="true" />

      <header className="home-header">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className={styles.main}>
        <section className={`${styles.card} ${statusInfo.tone === "ok" ? styles.ok : ""} ${statusInfo.tone === "warn" ? styles.warn : ""} ${statusInfo.tone === "error" ? styles.error : ""}`}>
          <p>Retorno do checkout</p>
          <h1>{statusInfo.title}</h1>
          <span>{statusInfo.description}</span>
          <CheckoutResultSync paymentId={paymentId} />

          <div className={styles.actions}>
            <Link href="/produtos" className="btn btn-primary">
              Ver produtos
            </Link>
            <Link href="/eventos" className="btn btn-soft">
              Ir para eventos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import CheckoutClient from "./checkout-client";
import styles from "./page.module.css";

type CheckoutPageProps = {
  searchParams: Promise<{ planoId?: string | string[] }>;
};

export default async function SubscriptionCheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const planoIdParam = resolvedSearchParams.planoId;
  const planoId = (Array.isArray(planoIdParam) ? planoIdParam[0] : planoIdParam ?? "").trim();

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
        <section className={styles.hero}>
          <p>Checkout</p>
          <h1>Finalize sua assinatura pelo Mercado Pago.</h1>
          <span>Revise os dados do plano e avance para o pagamento seguro.</span>
        </section>

        <CheckoutClient planoId={planoId} />
      </main>
    </div>
  );
}

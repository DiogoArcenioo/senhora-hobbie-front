import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import ProductDetailClient from "./product-detail-client";
import styles from "./page.module.css";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const produtoId = id?.trim() ?? "";

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
          <p>Pagina do produto</p>
          <h1>Veja todas as fotos, detalhes e finalize sua compra.</h1>
          <span>
            Estrutura focada em conversao: galeria completa, informacoes claras e botao direto para checkout no
            Mercado Pago.
          </span>
        </section>

        <ProductDetailClient produtoId={produtoId} />
      </main>
    </div>
  );
}

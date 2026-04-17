import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import MinhasComprasClient from "./minhas-compras-client";
import styles from "./page.module.css";

export default function MinhasComprasPage() {
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
          <p>Area da compradora</p>
          <h1>Minhas compras e endereco de entrega</h1>
          <span>
            Atualize o endereco para onde deseja receber os produtos e acompanhe o status de envio dos seus pedidos.
          </span>
        </section>

        <MinhasComprasClient />
      </main>
    </div>
  );
}

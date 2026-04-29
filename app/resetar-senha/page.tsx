import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import ResetPasswordClient from "./reset-password-client";
import styles from "./page.module.css";

export default function ResetPasswordPage() {
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
        <section className={styles.panel}>
          <Suspense fallback={<p className={styles.loading}>Carregando...</p>}>
            <ResetPasswordClient />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "../components/header-auth-actions";
import HeaderNavigation from "../components/header-navigation";
import SubscriptionPlans from "../components/subscription-plans";
import styles from "./page.module.css";

const perks = [
  "Entrega rastreada para todo Brasil",
  "Troca de plano sem taxa",
  "Conteudos extras liberados todo mes",
];

export default function SubscriptionPage() {
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
          <p>Area de assinaturas</p>
          <h1>Escolha seu plano e transforme sua rotina criativa.</h1>
          <span>
            Voce ja esta autenticada. Agora e so selecionar o plano ideal para receber seu kit e acessar a trilha do
            mes.
          </span>
        </section>

        <SubscriptionPlans />

        <section className={styles.perks}>
          <h3>Beneficios inclusos</h3>
          <div className={styles.perkList}>
            {perks.map((perk) => (
              <span key={perk}>{perk}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

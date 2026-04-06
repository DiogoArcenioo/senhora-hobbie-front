import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "../components/header-auth-actions";
import HeaderNavigation from "../components/header-navigation";
import HomeIntroOverlay from "../components/home-intro-overlay";
import styles from "./page.module.css";

const steps = [
  {
    title: "Escolha seu plano",
    description:
      "Voce escolhe a assinatura ideal e recebe acesso imediato ao calendario criativo do mes.",
  },
  {
    title: "Receba seu kit em casa",
    description:
      "Todo mes enviamos materiais, guia ilustrado e proposta artistica pensada para iniciantes e entusiastas.",
  },
  {
    title: "Crie no seu ritmo",
    description:
      "Participe do encontro guiado ao vivo ou faca as atividades no seu tempo com suporte da comunidade.",
  },
  {
    title: "Compartilhe e evolua",
    description:
      "Mostre seu processo, troque referencias e acompanhe sua evolucao com desafios leves e acolhedores.",
  },
];

const boxItems = [
  "Materiais principais da tecnica do mes",
  "Guia passo a passo com direcao criativa",
  "Paleta de cores e referencias visuais",
  "Desafio bonus para aprofundar o projeto",
];

const timeline = [
  { phase: "Semana 1", detail: "Entrega do kit + video de boas-vindas" },
  { phase: "Semana 2", detail: "Aula guiada e primeiro exercicio pratico" },
  { phase: "Semana 3", detail: "Encontro ao vivo para duvidas e ajustes" },
  { phase: "Semana 4", detail: "Mostra coletiva + desafio de fechamento" },
];

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <HomeIntroOverlay />

      <div className="home-noise" aria-hidden="true" />

      <header className="home-header reveal reveal-0">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className={styles.main}>
        <section className={`${styles.hero} reveal reveal-1`}>
          <div className={styles.heroCopy}>
            <p>Para quem esta chegando agora</p>
            <h1>Como funciona o clube em um ciclo simples e criativo.</h1>
            <span>
              Nossa assinatura foi desenhada para transformar hobby em ritual semanal, sem pressao e
              com acompanhamento.
            </span>

            <div className={styles.heroActions}>
              <Link className="btn btn-primary" href="/">
                Quero comecar
              </Link>
              <Link className="btn btn-soft" href="/eventos">
                Ver eventos passados
              </Link>
            </div>
          </div>

          <aside className={styles.heroAside}>
            <small>Ciclo atual</small>
            <strong>Aquarela Botanica</strong>
            <p>12 de abril de 2026</p>
            <span>2h30 de pratica guiada + suporte da comunidade</span>
          </aside>
        </section>

        <section className={`${styles.stepsSection} reveal reveal-2`}>
          <h2>Seu caminho no clube</h2>
          <div className={styles.stepsGrid}>
            {steps.map((step, index) => (
              <article key={step.title} className={styles.stepCard}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.detailsGrid} reveal reveal-3`}>
          <article className={styles.detailCard}>
            <h3>O que vem no kit mensal</h3>
            <ul>
              {boxItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={styles.detailCard}>
            <h3>Como o mes acontece</h3>
            <div className={styles.timeline}>
              {timeline.map((item) => (
                <div key={item.phase} className={styles.timelineItem}>
                  <small>{item.phase}</small>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={`${styles.finalCta} reveal reveal-4`}>
          <h2>Pronta para comecar com a gente?</h2>
          <p>Se voce quer criar com leveza, essa e a sua porta de entrada.</p>
          <Link className="btn btn-primary" href="/">
            Entrar para o clube
          </Link>
        </section>
      </main>
    </div>
  );
}
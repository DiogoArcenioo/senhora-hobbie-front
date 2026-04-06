import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "./components/header-auth-actions";
import HeaderNavigation from "./components/header-navigation";
import HomeHeroSlider from "./components/home-hero-slider";
import HomeIntroOverlay from "./components/home-intro-overlay";

const benefits = ["Kit criativo mensal", "Desafios autorais", "Comunidade acolhedora"];

const highlights = [
  {
    title: "Ritual de Criação",
    description:
      "Cada caixa chega com uma trilha de atividades leves para tornar o processo mais prazeroso.",
  },
  {
    title: "Curadoria Delicada",
    description:
      "Materiais pensados para pintura, bordado, colagem e escrita com acabamento de ateliê.",
  },
  {
    title: "Expressão sem Pressa",
    description:
      "Uma proposta para desacelerar, cuidar de si e criar algo seu com alegria.",
  },
];

export default function Home() {
  return (
    <div className="home-page">
      <HomeIntroOverlay />

      <div className="home-noise" aria-hidden="true" />

      <header className="home-header reveal reveal-0">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className="home-main">
        <HomeHeroSlider benefits={benefits} />

        <section className="home-highlights reveal reveal-3" id="como-funciona">
          {highlights.map((card) => (
            <article key={card.title} className="highlight-card">
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

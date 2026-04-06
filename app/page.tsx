import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "./components/header-auth-actions";
import HomeFeaturedImage from "./components/home-featured-image";
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

        <section className="home-about reveal reveal-4" id="quem-somos">
          <div className="about-copy">
            <p className="about-kicker">Quem Somos</p>
            <h2>Um clube criativo feito para mulheres que querem criar com leveza.</h2>
            <p>
              O Clube das Jovens Senhoras nasceu para transformar o tempo livre em um ritual de
              autocuidado, arte e conexão. A cada edição, montamos experiências acolhedoras para
              você explorar novos hobbies no seu ritmo.
            </p>
          </div>

          <HomeFeaturedImage />
        </section>

        <section className="home-contact reveal reveal-4" id="contato">
          <p className="contact-kicker">Contato</p>
          <h2>Fale com a gente!</h2>
          <a className="contact-phone" href="tel:+5548991644082">
            48 9164-4082
          </a>
        </section>
      </main>
    </div>
  );
}

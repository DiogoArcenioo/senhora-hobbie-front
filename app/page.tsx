import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "./components/header-auth-actions";
import HeaderNavigation from "./components/header-navigation";
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
        <section className="hero" id="assinar">
          <div className="hero-copy reveal reveal-1">
            <p className="hero-kicker">Arte em casa, todo mês</p>
            <h1>Seu hobby merece um clube delicado, criativo e cheio de cor.</h1>
            <p className="hero-description">
              Um espaço para explorar técnicas, desacelerar a rotina e transformar tempo livre em
              criação com propósito.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-primary" href="/como-funciona">
                Começar agora
              </Link>
              <Link className="btn btn-soft" href="/eventos">
                Ver edição do mês
              </Link>
            </div>

            <ul className="hero-tags">
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hero-art reveal reveal-2" aria-hidden="true">
            <div className="art-card art-card-main">
              <p>Ateliê do mês</p>
              <strong>Colagem botânica</strong>
              <span>Tintas, papéis especiais e guia ilustrado</span>
            </div>

            <div className="art-card art-card-mini">
              <p>Edição 08</p>
              <strong>Poética em aquarela</strong>
            </div>

            <div className="art-circle" />
            <div className="art-splash art-splash-1" />
            <div className="art-splash art-splash-2" />

            <svg className="art-doodle" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 75C55 20 120 20 204 62" />
              <path d="M74 111C90 92 132 84 176 95" />
            </svg>
          </div>
        </section>

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

          <div className="about-image-placeholder" role="img" aria-label="Espaço para foto da equipe ou do ateliê">
            <span>Imagem em destaque</span>
            <strong>Pronto para receber sua foto</strong>
          </div>
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

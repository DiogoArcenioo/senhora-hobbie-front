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
  const currentYear = new Date().getFullYear();

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

        <footer className="site-footer reveal reveal-4" id="contato" aria-label="Contato">
          <div className="site-footer-content">
            <div className="site-footer-brand">
              <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={180} height={90} />
              <p>Clube criativo para mulheres que querem criar com leveza.</p>

              <a
                className="site-footer-contact-item"
                href="https://wa.me/5548991644082"
                target="_blank"
                rel="noreferrer"
                aria-label="Conversar no WhatsApp"
              >
                <span className="site-footer-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fill="currentColor"
                      d="M20.2 3.8A9.9 9.9 0 0 0 4.5 15.7L3 21l5.5-1.4a9.9 9.9 0 0 0 14-8.9c0-2.6-1-5-2.3-6.9Zm-8.3 15a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A8.3 8.3 0 1 1 20.2 10a8.3 8.3 0 0 1-8.3 8.8Zm4.6-6.2c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.1l-.6.8c-.2.2-.3.3-.6.2a6.7 6.7 0 0 1-2-1.2 7.5 7.5 0 0 1-1.4-1.8c-.1-.2 0-.4.1-.5l.5-.6a.8.8 0 0 0 .1-.8l-.9-2.2c-.2-.3-.4-.3-.6-.3h-.6a1.2 1.2 0 0 0-.8.4c-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.2 5 4.3.7.3 1.3.5 1.8.6.8.3 1.4.2 1.9.2.6 0 1.8-.7 2.1-1.5.3-.8.3-1.4.2-1.5 0-.2-.3-.3-.6-.4Z"
                    />
                  </svg>
                </span>
                <span>48 9164-4082</span>
              </a>
            </div>

            <nav className="site-footer-links" aria-label="Navegacao do rodape">
              <Link href="/">Inicio</Link>
              <Link href="/como-funciona">Como funciona</Link>
              <Link href="/eventos">Eventos</Link>
              <Link href="/assinatura">Assinatura</Link>
            </nav>

            <div className="site-footer-social">
              <p>Redes sociais</p>
              <a
                className="site-footer-contact-item"
                href="https://www.instagram.com/senhora-hobbie"
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir perfil do Instagram"
              >
                <span className="site-footer-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect
                      x="3.1"
                      y="3.1"
                      width="17.8"
                      height="17.8"
                      rx="5.2"
                      ry="5.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="17.3" cy="6.8" r="1.3" fill="currentColor" />
                  </svg>
                </span>
                <span>@senhora-hobbie</span>
              </a>
            </div>
          </div>

          <div className="site-footer-copy">
            Copyright {currentYear} © Clube das Jovens Senhoras - Desenvolvido por Norte Sistemas
            de Gestao Inteligente
          </div>
        </footer>
      </main>
    </div>
  );
}

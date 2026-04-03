import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "../components/header-auth-actions";
import HeaderNavigation from "../components/header-navigation";
import HomeIntroOverlay from "../components/home-intro-overlay";

const pastEvents = [
  {
    title: "Piquenique de Pintura ao Ar Livre",
    date: "09 de fevereiro de 2026",
    description:
      "Nosso primeiro encontro do ano reuniu aquarela e observacao da natureza com exercicios de composicao e luz.",
  },
  {
    title: "Oficina de Bordado Contemporaneo",
    date: "23 de fevereiro de 2026",
    description:
      "Trabalhamos pontos livres e acabamento em bastidor, com foco em textura e criacao intuitiva.",
  },
  {
    title: "Laboratorio de Colagem Poetica",
    date: "08 de marco de 2026",
    description:
      "Uma tarde de narrativa visual com recortes, camadas de tinta e construcao de paletas autorais.",
  },
  {
    title: "Sessao de Caderno Criativo",
    date: "22 de marco de 2026",
    description:
      "Exploramos lettering, desenho espontaneo e registros visuais para manter uma rotina artistica leve.",
  },
  {
    title: "Atelie de Texturas em Tinta",
    date: "29 de marco de 2026",
    description:
      "Encontro dedicado a tecnicas de carimbo artesanal, manchas controladas e composicao final em dupla.",
  },
];

export default function EventsPage() {
  return (
    <div className="events-page">
      <HomeIntroOverlay />

      <div className="home-noise" aria-hidden="true" />

      <header className="home-header reveal reveal-0">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className="events-main">
        <section className="next-event-panel reveal reveal-1">
          <div className="calendar-card" aria-hidden="true">
            <span className="calendar-month">ABR 2026</span>
            <strong className="calendar-day">12</strong>
            <span className="calendar-weekday">DOMINGO</span>
          </div>

          <div className="next-event-description">
            <p>Proximo encontro</p>
            <h1>Aquarela Botanica em Camadas</h1>
            <h2>12 de abril de 2026 as 15h</h2>
            <span>Atelie da Senhora Hobbie - 2h30 de pratica guiada + cafe criativo</span>
          </div>
        </section>

        <section className="past-events reveal reveal-2">
          <h3>Eventos passados</h3>

          <div className="past-events-list">
            {pastEvents.map((event) => (
              <article key={event.title} className="past-event-card">
                <div className="past-event-cover">
                  <Image
                    src="/event-cover-placeholder.svg"
                    alt={`Capa simbolica do evento ${event.title}`}
                    width={92}
                    height={92}
                  />
                </div>

                <div className="past-event-copy">
                  <p>{event.date}</p>
                  <h4>{event.title}</h4>
                  <span>{event.description}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
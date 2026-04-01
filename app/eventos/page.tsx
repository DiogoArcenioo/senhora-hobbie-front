import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "../components/header-auth-actions";
import HeaderNavigation from "../components/header-navigation";

const pastEvents = [
  {
    title: "Piquenique de Pintura ao Ar Livre",
    date: "09 de fevereiro de 2026",
    description:
      "Nosso primeiro encontro do ano reuniu aquarela e observação da natureza com exercícios de composição e luz.",
  },
  {
    title: "Oficina de Bordado Contemporâneo",
    date: "23 de fevereiro de 2026",
    description:
      "Trabalhamos pontos livres e acabamento em bastidor, com foco em textura e criação intuitiva.",
  },
  {
    title: "Laboratório de Colagem Poética",
    date: "08 de março de 2026",
    description:
      "Uma tarde de narrativa visual com recortes, camadas de tinta e construção de paletas autorais.",
  },
  {
    title: "Sessão de Caderno Criativo",
    date: "22 de março de 2026",
    description:
      "Exploramos lettering, desenho espontâneo e registros visuais para manter uma rotina artística leve.",
  },
  {
    title: "Ateliê de Texturas em Tinta",
    date: "29 de março de 2026",
    description:
      "Encontro dedicado a técnicas de carimbo artesanal, manchas controladas e composição final em dupla.",
  },
];

export default function EventsPage() {
  return (
    <div className="events-page">
      <div className="home-noise" aria-hidden="true" />

      <header className="home-header">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className="events-main">
        <section className="next-event-panel">
          <div className="calendar-card" aria-hidden="true">
            <span className="calendar-month">ABR 2026</span>
            <strong className="calendar-day">12</strong>
            <span className="calendar-weekday">DOMINGO</span>
          </div>

          <div className="next-event-description">
            <p>Próximo encontro</p>
            <h1>Aquarela Botânica em Camadas</h1>
            <h2>12 de abril de 2026 às 15h</h2>
            <span>Ateliê da Senhora Hobbie • 2h30 de prática guiada + café criativo</span>
          </div>
        </section>

        <section className="past-events">
          <h3>Eventos passados</h3>

          <div className="past-events-list">
            {pastEvents.map((event) => (
              <article key={event.title} className="past-event-card">
                <div className="past-event-cover">
                  <Image
                    src="/event-cover-placeholder.svg"
                    alt={`Capa simbólica do evento ${event.title}`}
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

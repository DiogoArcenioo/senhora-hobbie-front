import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventAlbumGallery from "@/app/components/event-album-gallery";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import HomeIntroOverlay from "@/app/components/home-intro-overlay";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";
import styles from "./page.module.css";

type AlbumFoto = {
  id: string;
  url: string;
  legenda: string | null;
  ordem: number;
};

type EventoAlbum = {
  id: string;
  titulo: string;
  descricaoResumo: string;
  descricaoDetalhada: string | null;
  inicioEm: string;
  fimEm: string | null;
  localNome: string | null;
  localEndereco: string | null;
  capaUrl: string | null;
  fotos: AlbumFoto[];
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatFullDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function EventoAlbumPage(context: RouteContext) {
  const { id } = await context.params;

  if (!id?.trim()) {
    notFound();
  }

  const response = await fetch(buildBackendUrl(`/eventos/public/${encodeURIComponent(id)}/album`), {
    method: "GET",
    cache: "no-store",
  });

  const payload = await parseBackendPayload(response);

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }

    const message = getBackendErrorMessage(payload) ?? "Nao foi possivel carregar o album do evento.";

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

        <main className={styles.main}>
          <section className={styles.errorCard}>
            <h1>Album do evento</h1>
            <p>{message}</p>
            <Link href="/eventos" className="btn btn-primary">
              Voltar para eventos
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const evento = payload as EventoAlbum;

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

      <main className={styles.main}>
        <section className={`${styles.hero} reveal reveal-1`}>
          <p className={styles.kicker}>{formatFullDate(evento.inicioEm)}</p>
          <h1>{evento.titulo}</h1>
          <span>{evento.descricaoDetalhada || evento.descricaoResumo}</span>
          <div className={styles.meta}>
            {[evento.localNome, evento.localEndereco].filter((item) => item && item.trim().length > 0).join(" - ")}
          </div>
          <Link href="/eventos" className="btn btn-soft">
            Voltar para eventos
          </Link>
        </section>

        <section className={`${styles.gallerySection} reveal reveal-2`}>
          <EventAlbumGallery titulo={evento.titulo} capaUrl={evento.capaUrl} fotos={evento.fotos} />
        </section>
      </main>
    </div>
  );
}
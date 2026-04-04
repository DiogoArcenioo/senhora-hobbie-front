"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

type AlbumFoto = {
  id: string;
  url: string;
  legenda: string | null;
  ordem: number;
};

type Props = {
  titulo: string;
  capaUrl: string | null;
  fotos: AlbumFoto[];
};

type ZoomedImage = {
  src: string;
  alt: string;
};

export default function EventAlbumGallery({ titulo, capaUrl, fotos }: Props) {
  const [zoomedImage, setZoomedImage] = useState<ZoomedImage | null>(null);
  const canUsePortal = typeof document !== "undefined";

  const images = useMemo(() => {
    const fromCover = capaUrl
      ? [{ src: capaUrl, alt: `Capa do evento ${titulo}`, key: `cover-${titulo}` }]
      : [];

    const fromAlbum = fotos.map((foto) => ({
      src: foto.url,
      alt: foto.legenda || `Foto do evento ${titulo}`,
      key: foto.id,
    }));

    return [...fromCover, ...fromAlbum];
  }, [capaUrl, fotos, titulo]);

  return (
    <>
      <div className="event-page-gallery-grid">
        {images.map((image) => (
          <button
            key={image.key}
            type="button"
            className="event-page-gallery-button"
            onClick={() => setZoomedImage({ src: image.src, alt: image.alt })}
            aria-label={`Abrir imagem: ${image.alt}`}
          >
            <img src={image.src} alt={image.alt} className="event-page-gallery-image" />
          </button>
        ))}
      </div>

      {canUsePortal && zoomedImage ? createPortal(
        <div className="event-image-zoom-backdrop" onClick={() => setZoomedImage(null)} role="presentation">
          <section className="event-image-zoom-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="event-image-zoom-header">
              <p>Visualizacao da foto</p>
              <button type="button" className="event-album-close" onClick={() => setZoomedImage(null)}>
                Fechar
              </button>
            </div>
            <img src={zoomedImage.src} alt={zoomedImage.alt} className="event-image-zoomed" />
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  TOKEN_TYPE_STORAGE_KEY,
} from "@/app/lib/auth-session";

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
};

type EventoResumo = {
  id: string;
  titulo: string;
  descricaoResumo: string;
  inicioEm: string;
  localNome: string | null;
  localEndereco: string | null;
  capaUrl: string | null;
};

type EventosResponse = {
  proximoEvento: EventoResumo | null;
  eventosPassados: EventoResumo[];
  message?: string;
};

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

type AlbumResponse = EventoAlbum & {
  message?: string;
};

type EventoFormState = {
  titulo: string;
  descricaoResumo: string;
  descricaoDetalhada: string;
  localNome: string;
  localEndereco: string;
  inicioEm: string;
  fimEm: string;
};

function readAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decodedPayload = atob(paddedPayload);
    const payload = JSON.parse(decodedPayload) as JwtPayload;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function isAdmin(user: AuthUser | null): boolean {
  return typeof user?.tipo === "string" && user.tipo.trim().toUpperCase() === "ADM";
}

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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCalendarParts(value: string): { monthYear: string; day: string; weekday: string } {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      monthYear: "---",
      day: "--",
      weekday: "---",
    };
  }

  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
  const year = new Intl.DateTimeFormat("pt-BR", { year: "numeric" }).format(date);
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);

  return {
    monthYear: `${month.toUpperCase()} ${year}`,
    day,
    weekday: weekday.toUpperCase(),
  };
}

const EMPTY_FORM: EventoFormState = {
  titulo: "",
  descricaoResumo: "",
  descricaoDetalhada: "",
  localNome: "",
  localEndereco: "",
  inicioEm: "",
  fimEm: "",
};

export default function EventsDynamicContent() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminFromToken, setIsAdminFromToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [proximoEvento, setProximoEvento] = useState<EventoResumo | null>(null);
  const [eventosPassados, setEventosPassados] = useState<EventoResumo[]>([]);
  const [formState, setFormState] = useState<EventoFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [albumEvento, setAlbumEvento] = useState<EventoAlbum | null>(null);
  const [albumError, setAlbumError] = useState("");
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const photosInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateEventos = useMemo(
    () => isAdmin(authUser) || isAdminFromToken,
    [authUser, isAdminFromToken],
  );

  const syncAuth = useCallback(() => {
    setAuthUser(readAuthUser());

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const tokenPayload = decodeJwtPayload(token);

    const adminFromToken =
      typeof tokenPayload?.tipo === "string" && tokenPayload.tipo.trim().toUpperCase() === "ADM";

    setIsAdminFromToken(adminFromToken);
  }, []);

  const loadEventos = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/eventos", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as EventosResponse | null;

      if (!response.ok) {
        setLoadError(payload?.message ?? "Nao foi possivel carregar os eventos.");
        setProximoEvento(null);
        setEventosPassados([]);
        return;
      }

      setProximoEvento(payload?.proximoEvento ?? null);
      setEventosPassados(Array.isArray(payload?.eventosPassados) ? payload!.eventosPassados : []);
    } catch {
      setLoadError("Erro inesperado ao carregar os eventos.");
      setProximoEvento(null);
      setEventosPassados([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncAuth();
    window.addEventListener(AUTH_SESSION_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, [syncAuth]);

  useEffect(() => {
    void loadEventos();
  }, [loadEventos]);

  const openAlbum = async (eventoId: string) => {
    setAlbumEvento(null);
    setAlbumError("");
    setIsAlbumLoading(true);

    try {
      const response = await fetch(`/api/eventos/${encodeURIComponent(eventoId)}/album`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as AlbumResponse | null;

      if (!response.ok) {
        setAlbumError(payload?.message ?? "Nao foi possivel carregar o album.");
        return;
      }

      setAlbumEvento(payload as EventoAlbum);
    } catch {
      setAlbumError("Erro inesperado ao carregar o album.");
    } finally {
      setIsAlbumLoading(false);
    }
  };

  const closeAlbum = () => {
    setAlbumEvento(null);
    setAlbumError("");
    setIsAlbumLoading(false);
  };

  const updateField = (field: keyof EventoFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitEvento = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
    const tokenType = window.localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

    if (!token) {
      setFormError("Faca login como ADM para cadastrar evento.");
      return;
    }

    const capaArquivo = coverInputRef.current?.files?.[0] ?? null;

    if (!capaArquivo) {
      setFormError("Selecione a foto de capa do evento.");
      return;
    }

    if (!formState.titulo.trim() || !formState.descricaoResumo.trim() || !formState.inicioEm.trim()) {
      setFormError("Preencha titulo, resumo e data de inicio.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      const payload = new FormData();
      payload.append("titulo", formState.titulo.trim());
      payload.append("descricao_resumo", formState.descricaoResumo.trim());
      payload.append("inicio_em", formState.inicioEm);
      payload.append("status", "PUBLICADO");
      payload.append("capa", capaArquivo);

      if (formState.descricaoDetalhada.trim()) {
        payload.append("descricao_detalhada", formState.descricaoDetalhada.trim());
      }

      if (formState.localNome.trim()) {
        payload.append("local_nome", formState.localNome.trim());
      }

      if (formState.localEndereco.trim()) {
        payload.append("local_endereco", formState.localEndereco.trim());
      }

      if (formState.fimEm.trim()) {
        payload.append("fim_em", formState.fimEm);
      }

      const fotos = photosInputRef.current?.files;

      if (fotos && fotos.length > 0) {
        for (const file of Array.from(fotos)) {
          payload.append("fotos", file);
        }
      }

      const response = await fetch("/api/eventos", {
        method: "POST",
        headers: {
          Authorization: `${tokenType} ${token}`,
        },
        body: payload,
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setFormError(data?.message ?? "Nao foi possivel cadastrar o evento.");
        return;
      }

      setFormState(EMPTY_FORM);

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      if (photosInputRef.current) {
        photosInputRef.current.value = "";
      }

      setFormSuccess("Evento cadastrado com sucesso.");
      await loadEventos();
    } catch {
      setFormError("Erro inesperado ao cadastrar evento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextCalendar = proximoEvento ? formatCalendarParts(proximoEvento.inicioEm) : null;

  return (
    <main className="events-main">
      {canCreateEventos ? (
        <section className="event-admin-panel reveal reveal-1">
          <div className="event-admin-header">
            <p>Area ADM</p>
            <h2>Cadastrar evento com capa e album</h2>
          </div>

          <form className="event-admin-form" onSubmit={submitEvento}>
            <label>
              Titulo
              <input
                type="text"
                value={formState.titulo}
                onChange={(e) => updateField("titulo", e.target.value)}
                placeholder="Ex.: Aquarela Botanica em Camadas"
                required
                disabled={isSubmitting}
              />
            </label>

            <label>
              Resumo
              <textarea
                value={formState.descricaoResumo}
                onChange={(e) => updateField("descricaoResumo", e.target.value)}
                placeholder="Descricao curta para o card"
                required
                disabled={isSubmitting}
              />
            </label>

            <label>
              Descricao detalhada (album)
              <textarea
                value={formState.descricaoDetalhada}
                onChange={(e) => updateField("descricaoDetalhada", e.target.value)}
                placeholder="Texto maior para abrir ao clicar no evento"
                disabled={isSubmitting}
              />
            </label>

            <label>
              Local (nome)
              <input
                type="text"
                value={formState.localNome}
                onChange={(e) => updateField("localNome", e.target.value)}
                placeholder="Ex.: Atelie da Senhora Hobbie"
                disabled={isSubmitting}
              />
            </label>

            <label>
              Endereco (opcional)
              <input
                type="text"
                value={formState.localEndereco}
                onChange={(e) => updateField("localEndereco", e.target.value)}
                placeholder="Rua, bairro, cidade"
                disabled={isSubmitting}
              />
            </label>

            <label>
              Inicio
              <input
                type="datetime-local"
                value={formState.inicioEm}
                onChange={(e) => updateField("inicioEm", e.target.value)}
                required
                disabled={isSubmitting}
              />
            </label>

            <label>
              Fim (opcional)
              <input
                type="datetime-local"
                value={formState.fimEm}
                onChange={(e) => updateField("fimEm", e.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label>
              Foto de capa
              <input ref={coverInputRef} type="file" accept="image/*" required disabled={isSubmitting} />
            </label>

            <label>
              Fotos do album (multiplas)
              <input ref={photosInputRef} type="file" accept="image/*" multiple disabled={isSubmitting} />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Cadastrar evento"}
            </button>
          </form>

          {formError ? <p className="event-admin-feedback event-admin-feedback-error">{formError}</p> : null}
          {formSuccess ? <p className="event-admin-feedback event-admin-feedback-success">{formSuccess}</p> : null}
        </section>
      ) : null}

      <section className="next-event-panel reveal reveal-2">
        {proximoEvento && nextCalendar ? (
          <button type="button" className="next-event-button" onClick={() => void openAlbum(proximoEvento.id)}>
            <div className="calendar-card" aria-hidden="true">
              <span className="calendar-month">{nextCalendar.monthYear}</span>
              <strong className="calendar-day">{nextCalendar.day}</strong>
              <span className="calendar-weekday">{nextCalendar.weekday}</span>
            </div>

            <div className="next-event-description">
              <p>Proximo encontro</p>
              <h1>{proximoEvento.titulo}</h1>
              <h2>{formatFullDate(proximoEvento.inicioEm)}</h2>
              <span>
                {[proximoEvento.localNome, proximoEvento.localEndereco, proximoEvento.descricaoResumo]
                  .filter((item) => typeof item === "string" && item.trim().length > 0)
                  .join(" - ")}
              </span>
            </div>
          </button>
        ) : (
          <div className="next-event-empty">
            <p>Proximo encontro</p>
            <h1>Nenhum evento futuro cadastrado.</h1>
            <span>Assim que um ADM cadastrar um evento com data futura, ele aparece aqui automaticamente.</span>
          </div>
        )}
      </section>

      <section className="past-events reveal reveal-3">
        <h3>Eventos passados</h3>

        {isLoading ? <p className="events-feedback">Carregando eventos...</p> : null}
        {loadError ? <p className="events-feedback events-feedback-error">{loadError}</p> : null}

        {!isLoading && !loadError ? (
          <div className="past-events-list">
            {eventosPassados.length === 0 ? (
              <p className="events-feedback">Nenhum evento passado cadastrado ainda.</p>
            ) : (
              eventosPassados.map((evento) => (
                <button
                  type="button"
                  key={evento.id}
                  className="past-event-card past-event-card-button"
                  onClick={() => void openAlbum(evento.id)}
                >
                  <div className="past-event-cover">
                    {evento.capaUrl ? (
                      <img src={evento.capaUrl} alt={`Capa do evento ${evento.titulo}`} className="past-event-cover-full" />
                    ) : (
                      <img
                        src="/event-cover-placeholder.svg"
                        alt={`Capa simbolica do evento ${evento.titulo}`}
                        className="past-event-cover-icon"
                      />
                    )}
                  </div>

                  <div className="past-event-copy">
                    <p>{formatDate(evento.inicioEm)}</p>
                    <h4>{evento.titulo}</h4>
                    <span>{evento.descricaoResumo}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
      </section>

      {(albumEvento || albumError || isAlbumLoading) && (
        <div className="event-album-backdrop" onClick={closeAlbum} role="presentation">
          <section className="event-album-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="event-album-close" onClick={closeAlbum}>
              Fechar
            </button>

            {isAlbumLoading ? <p className="events-feedback">Carregando album...</p> : null}
            {albumError ? <p className="events-feedback events-feedback-error">{albumError}</p> : null}

            {albumEvento ? (
              <>
                <header className="event-album-header">
                  <p>{formatFullDate(albumEvento.inicioEm)}</p>
                  <h3>{albumEvento.titulo}</h3>
                  <span>{albumEvento.descricaoDetalhada || albumEvento.descricaoResumo}</span>
                </header>

                <div className="event-album-grid">
                  {albumEvento.capaUrl ? (
                    <img src={albumEvento.capaUrl} alt={`Capa do evento ${albumEvento.titulo}`} className="event-album-image" />
                  ) : null}

                  {albumEvento.fotos.map((foto) => (
                    <img key={foto.id} src={foto.url} alt={foto.legenda || `Foto do evento ${albumEvento.titulo}`} className="event-album-image" />
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/produtos/page.module.css";
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

type ProdutoFoto = {
  id: string;
  url: string;
  legenda: string | null;
  ordem: number;
};

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  moeda: string;
  capaUrl: string | null;
  slug?: string;
  ativo?: boolean;
  fotos?: ProdutoFoto[];
};

type ProdutoFormState = {
  nome: string;
  descricao: string;
  preco: string;
  moeda: string;
  ativo: boolean;
};

type ApiErrorPayload = {
  message?: string | string[];
};

type FormMode = "create" | "edit";

const EMPTY_FORM: ProdutoFormState = {
  nome: "",
  descricao: "",
  preco: "",
  moeda: "BRL",
  ativo: true,
};

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const { message } = payload as ApiErrorPayload;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
    return message[0];
  }

  return fallbackMessage;
}

function formatCurrency(value: string | number, currencyCode: string): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  const normalizedCurrency = (currencyCode || "BRL").toUpperCase();

  if (Number.isNaN(numericValue)) {
    return `${value} ${normalizedCurrency}`;
  }

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${numericValue.toFixed(2)} ${normalizedCurrency}`;
  }
}

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

function isAdminUser(authUser: AuthUser | null): boolean {
  return typeof authUser?.tipo === "string" && authUser.tipo.trim().toUpperCase() === "ADM";
}

function getAuthorizationHeader(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";

  if (!token) {
    return null;
  }

  const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";
  return `${tokenType} ${token}`;
}

function normalizeProdutos(payload: unknown): Produto[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const produtosNormalizados: Produto[] = [];

  for (const item of payload) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";
    const preco = typeof raw.preco === "string" ? raw.preco : "";
    const moeda = typeof raw.moeda === "string" ? raw.moeda : "BRL";

    if (!id || !nome || !preco) {
      continue;
    }

    const fotos: ProdutoFoto[] | undefined = Array.isArray(raw.fotos)
      ? raw.fotos
          .map((foto) => {
            if (!foto || typeof foto !== "object") {
              return null;
            }

            const fotoRaw = foto as Record<string, unknown>;
            const fotoId = typeof fotoRaw.id === "string" ? fotoRaw.id.trim() : "";
            const fotoUrl = typeof fotoRaw.url === "string" ? fotoRaw.url.trim() : "";
            const ordem = typeof fotoRaw.ordem === "number" ? fotoRaw.ordem : 0;

            if (!fotoId || !fotoUrl) {
              return null;
            }

            return {
              id: fotoId,
              url: fotoUrl,
              legenda:
                typeof fotoRaw.legenda === "string" && fotoRaw.legenda.trim() ? fotoRaw.legenda.trim() : null,
              ordem,
            };
          })
          .filter((foto): foto is ProdutoFoto => foto !== null)
      : undefined;

    produtosNormalizados.push({
      id,
      nome,
      descricao: typeof raw.descricao === "string" && raw.descricao.trim() ? raw.descricao.trim() : null,
      preco,
      moeda,
      capaUrl: typeof raw.capaUrl === "string" && raw.capaUrl.trim() ? raw.capaUrl.trim() : null,
      slug: typeof raw.slug === "string" ? raw.slug : undefined,
      ativo: typeof raw.ativo === "boolean" ? raw.ativo : undefined,
      fotos,
    });
  }

  return produtosNormalizados;
}

function mapProdutoToFormState(produto: Produto): ProdutoFormState {
  return {
    nome: produto.nome,
    descricao: produto.descricao ?? "",
    preco: produto.preco,
    moeda: produto.moeda || "BRL",
    ativo: typeof produto.ativo === "boolean" ? produto.ativo : true,
  };
}

export default function ProductsCatalog() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>("create");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProdutoFormState>(EMPTY_FORM);
  const [existingPhotos, setExistingPhotos] = useState<ProdutoFoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const photosInputRef = useRef<HTMLInputElement | null>(null);

  const syncAdminAccess = useCallback(() => {
    const authUser = readAuthUser();
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const tokenPayload = decodeJwtPayload(token);

    const adminFromStorage = isAdminUser(authUser);
    const adminFromToken =
      typeof tokenPayload?.tipo === "string" && tokenPayload.tipo.trim().toUpperCase() === "ADM";

    setIsAdmin(adminFromStorage || adminFromToken);
  }, []);

  const loadProdutos = useCallback(async (forceAdminLoad = false) => {
    const authorizationHeader = getAuthorizationHeader();
    const shouldLoadAdmin = forceAdminLoad || (isAdmin && !!authorizationHeader);

    setIsLoading(true);

    try {
      const response = await fetch(shouldLoadAdmin ? "/api/produtos/admin" : "/api/produtos", {
        method: "GET",
        headers: shouldLoadAdmin && authorizationHeader
          ? {
              Authorization: authorizationHeader,
            }
          : undefined,
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok && shouldLoadAdmin && (response.status === 401 || response.status === 403)) {
        const publicResponse = await fetch("/api/produtos", {
          method: "GET",
          cache: "no-store",
        });
        const publicPayload = (await publicResponse.json().catch(() => null)) as unknown;

        if (!publicResponse.ok) {
          throw new Error(resolveErrorMessage(publicPayload, "Nao foi possivel carregar os produtos."));
        }

        setProdutos(normalizeProdutos(publicPayload));
        setErrorMessage("");
        return;
      }

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar os produtos."));
      }

      setProdutos(normalizeProdutos(payload));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao carregar produtos.",
      );
      setProdutos([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    syncAdminAccess();
    window.addEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
    window.addEventListener("storage", syncAdminAccess);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAdminAccess);
      window.removeEventListener("storage", syncAdminAccess);
    };
  }, [syncAdminAccess]);

  useEffect(() => {
    void loadProdutos();
  }, [loadProdutos]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingProductId(null);
    setFormState(EMPTY_FORM);
    setExistingPhotos([]);
    setRemovedPhotoIds([]);
    setModalError("");
    setModalSuccess("");

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }

    if (photosInputRef.current) {
      photosInputRef.current.value = "";
    }

    setIsModalOpen(true);
  };

  const openEditModal = (produto: Produto) => {
    setModalMode("edit");
    setEditingProductId(produto.id);
    setFormState(mapProdutoToFormState(produto));
    setExistingPhotos(Array.isArray(produto.fotos) ? produto.fotos : []);
    setRemovedPhotoIds([]);
    setModalError("");
    setModalSuccess("");

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }

    if (photosInputRef.current) {
      photosInputRef.current.value = "";
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving || isDeactivating) {
      return;
    }

    setIsModalOpen(false);
    setModalError("");
    setModalSuccess("");
  };

  const forceCloseModal = () => {
    setIsModalOpen(false);
    setModalError("");
    setModalSuccess("");
  };

  const updateFormField = <K extends keyof ProdutoFormState>(field: K, value: ProdutoFormState[K]) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleRemovePhoto = (photoId: string) => {
    setRemovedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((item) => item !== photoId) : [...prev, photoId],
    );
  };

  const submitProduto = async () => {
    if (isSaving) {
      return;
    }

    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setModalError("Faca login como admin para continuar.");
      return;
    }

    const coverFile = coverInputRef.current?.files?.[0] ?? null;

    if (modalMode === "create" && !coverFile) {
      setModalError("Selecione a foto de capa do produto.");
      return;
    }

    if (!formState.nome.trim() || !formState.preco.trim()) {
      setModalError("Nome e preco sao obrigatorios.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    setModalSuccess("");

    try {
      const payload = new FormData();
      payload.append("nome", formState.nome.trim());
      payload.append("preco", formState.preco.trim());
      payload.append("moeda", formState.moeda.trim() || "BRL");
      payload.append("ativo", String(formState.ativo));

      if (formState.descricao.trim()) {
        payload.append("descricao", formState.descricao.trim());
      }

      if (coverFile) {
        payload.append("capa", coverFile);
      }

      const newPhotos = photosInputRef.current?.files;

      if (newPhotos && newPhotos.length > 0) {
        for (const file of Array.from(newPhotos)) {
          payload.append("fotos", file);
        }
      }

      const isEditing = modalMode === "edit" && typeof editingProductId === "string" && editingProductId.trim().length > 0;
      const endpoint = isEditing ? `/api/produtos/${encodeURIComponent(editingProductId!)}` : "/api/produtos";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: authorizationHeader,
        },
        body: payload,
      });

      const responsePayload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(responsePayload, "Nao foi possivel salvar produto."));
      }

      if (isEditing && editingProductId && removedPhotoIds.length > 0) {
        for (const fotoId of removedPhotoIds) {
          const deleteResponse = await fetch(
            `/api/produtos/${encodeURIComponent(editingProductId)}/fotos/${encodeURIComponent(fotoId)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: authorizationHeader,
              },
            },
          );

          const deletePayload = (await deleteResponse.json().catch(() => null)) as unknown;

          if (!deleteResponse.ok) {
            throw new Error(resolveErrorMessage(deletePayload, "Nao foi possivel remover uma foto do produto."));
          }
        }
      }

      await loadProdutos(true);
      setModalSuccess(isEditing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");

      if (modalMode === "create") {
        setFormState(EMPTY_FORM);
        setExistingPhotos([]);
        setRemovedPhotoIds([]);

        if (coverInputRef.current) {
          coverInputRef.current.value = "";
        }

        if (photosInputRef.current) {
          photosInputRef.current.value = "";
        }
      } else {
        forceCloseModal();
      }
    } catch (error) {
      setModalError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao salvar produto.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inativarProduto = async () => {
    if (!editingProductId || isDeactivating) {
      return;
    }

    const confirmDelete = window.confirm("Deseja inativar este produto?");

    if (!confirmDelete) {
      return;
    }

    const authorizationHeader = getAuthorizationHeader();

    if (!authorizationHeader) {
      setModalError("Faca login como admin para continuar.");
      return;
    }

    setIsDeactivating(true);
    setModalError("");
    setModalSuccess("");

    try {
      const response = await fetch(`/api/produtos/${encodeURIComponent(editingProductId)}`, {
        method: "DELETE",
        headers: {
          Authorization: authorizationHeader,
        },
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel inativar produto."));
      }

      await loadProdutos(true);
      setModalSuccess("Produto inativado com sucesso.");
      forceCloseModal();
    } catch (error) {
      setModalError(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao inativar produto.",
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) {
    return <div className={styles.statePanel}>Carregando produtos...</div>;
  }

  if (errorMessage) {
    return <div className={styles.statePanel}>{errorMessage}</div>;
  }

  return (
    <>
      {isAdmin ? (
        <div className={styles.adminActions}>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Novo produto
          </button>
        </div>
      ) : null}

      {produtos.length === 0 ? (
        <div className={styles.statePanel}>Nenhum produto cadastrado ainda.</div>
      ) : (
        <section className={styles.productGrid}>
          {produtos.map((produto) => (
            <article
              key={produto.id}
              className={`${styles.productCard} ${typeof produto.ativo === "boolean" && !produto.ativo ? styles.inactive : ""}`}
            >
              <div className={styles.productCover}>
                {produto.capaUrl ? (
                  <img src={produto.capaUrl} alt={`Capa do produto ${produto.nome}`} />
                ) : (
                  <span>Sem capa</span>
                )}
              </div>

              <h2>{produto.nome}</h2>
              <strong>{formatCurrency(produto.preco, produto.moeda)}</strong>
              <p>{produto.descricao?.trim() ? produto.descricao : "Sem descricao cadastrada para este produto."}</p>

              {typeof produto.ativo === "boolean" ? (
                <small className={styles.productStatus}>Status: {produto.ativo ? "Ativo" : "Inativo"}</small>
              ) : null}

              <div className={styles.productActions}>
                {(typeof produto.ativo === "boolean" ? produto.ativo : true) ? (
                  <Link href={`/produtos/checkout?produtoId=${encodeURIComponent(produto.id)}`} className="btn btn-primary">
                    Comprar
                  </Link>
                ) : (
                  <span className={styles.productInactiveLabel}>Produto indisponivel</span>
                )}

                {isAdmin ? (
                  <button type="button" className="btn btn-soft" onClick={() => openEditModal(produto)}>
                    Editar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}

      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={closeModal}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{modalMode === "create" ? "Novo produto" : "Editar produto"}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                disabled={isSaving || isDeactivating}
              >
                Fechar
              </button>
            </div>

            <div className={styles.modalFormGrid}>
              <label>
                Nome
                <input
                  type="text"
                  value={formState.nome}
                  onChange={(event) => updateFormField("nome", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Preco
                <input
                  type="text"
                  value={formState.preco}
                  onChange={(event) => updateFormField("preco", event.target.value)}
                  placeholder="Ex.: 149.90"
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Moeda
                <input
                  type="text"
                  value={formState.moeda}
                  onChange={(event) => updateFormField("moeda", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formState.ativo}
                  onChange={(event) => updateFormField("ativo", event.target.checked)}
                  disabled={isSaving || isDeactivating}
                />
                Ativo
              </label>

              <label className={styles.descriptionLabel}>
                Descricao
                <textarea
                  value={formState.descricao}
                  onChange={(event) => updateFormField("descricao", event.target.value)}
                  disabled={isSaving || isDeactivating}
                />
              </label>

              <label>
                Foto de capa {modalMode === "create" ? "" : "(opcional)"}
                <input ref={coverInputRef} type="file" accept="image/*" disabled={isSaving || isDeactivating} />
              </label>

              <label className={styles.descriptionLabel}>
                Fotos da galeria (multiplas)
                <input
                  ref={photosInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isSaving || isDeactivating}
                />
              </label>
            </div>

            {modalMode === "edit" ? (
              <div className={styles.existingPhotosBlock}>
                <strong>Fotos atuais da galeria</strong>
                {existingPhotos.length === 0 ? (
                  <p>Nenhuma foto cadastrada na galeria.</p>
                ) : (
                  <div className={styles.existingPhotosGrid}>
                    {existingPhotos.map((foto) => {
                      const marked = removedPhotoIds.includes(foto.id);

                      return (
                        <article key={foto.id} className={`${styles.existingPhotoItem} ${marked ? styles.marked : ""}`}>
                          <img src={foto.url} alt={foto.legenda || "Foto do produto"} />
                          <button
                            type="button"
                            onClick={() => toggleRemovePhoto(foto.id)}
                            disabled={isSaving || isDeactivating}
                          >
                            {marked ? "Desfazer" : "Remover"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {modalError ? <p className={styles.modalError}>{modalError}</p> : null}
            {modalSuccess ? <p className={styles.modalSuccess}>{modalSuccess}</p> : null}

            <div className={styles.modalActions}>
              <button type="button" className="btn btn-primary" onClick={submitProduto} disabled={isSaving || isDeactivating}>
                {isSaving ? "Salvando..." : modalMode === "create" ? "Cadastrar" : "Salvar"}
              </button>

              {modalMode === "edit" ? (
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={inativarProduto}
                  disabled={isSaving || isDeactivating}
                >
                  {isDeactivating ? "Inativando..." : "Inativar"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TOKEN_STORAGE_KEY, TOKEN_TYPE_STORAGE_KEY } from "@/app/lib/auth-session";
import styles from "./page.module.css";

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
  ativo: boolean;
  fotos: ProdutoFoto[];
};

type ProdutoImagem = {
  id: string;
  url: string;
  alt: string;
  ordem: number;
};

type ProductDetailClientProps = {
  produtoId: string;
};

type ApiPayload = {
  message?: string | string[];
  checkout_url?: string;
};

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const { message } = payload as ApiPayload;

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

function normalizeProduto(payload: unknown): Produto | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";
  const preco = typeof raw.preco === "string" ? raw.preco.trim() : "";

  if (!id || !nome || !preco) {
    return null;
  }

  const fotos: ProdutoFoto[] = Array.isArray(raw.fotos)
    ? raw.fotos
        .map((foto) => {
          if (!foto || typeof foto !== "object") {
            return null;
          }

          const fotoRaw = foto as Record<string, unknown>;
          const fotoId = typeof fotoRaw.id === "string" ? fotoRaw.id.trim() : "";
          const fotoUrl = typeof fotoRaw.url === "string" ? fotoRaw.url.trim() : "";
          const ordemNumber =
            typeof fotoRaw.ordem === "number"
              ? fotoRaw.ordem
              : Number(typeof fotoRaw.ordem === "string" ? fotoRaw.ordem : Number.NaN);

          if (!fotoId || !fotoUrl) {
            return null;
          }

          return {
            id: fotoId,
            url: fotoUrl,
            legenda:
              typeof fotoRaw.legenda === "string" && fotoRaw.legenda.trim() ? fotoRaw.legenda.trim() : null,
            ordem: Number.isFinite(ordemNumber) ? ordemNumber : 0,
          };
        })
        .filter((foto): foto is ProdutoFoto => foto !== null)
        .sort((a, b) => a.ordem - b.ordem)
    : [];

  return {
    id,
    nome,
    descricao: typeof raw.descricao === "string" && raw.descricao.trim() ? raw.descricao.trim() : null,
    preco,
    moeda: typeof raw.moeda === "string" && raw.moeda.trim() ? raw.moeda.trim().toUpperCase() : "BRL",
    capaUrl: typeof raw.capaUrl === "string" && raw.capaUrl.trim() ? raw.capaUrl.trim() : null,
    ativo: typeof raw.ativo === "boolean" ? raw.ativo : true,
    fotos,
  };
}

function buildGalleryImages(produto: Produto): ProdutoImagem[] {
  const images: ProdutoImagem[] = [];
  const seenUrls = new Set<string>();

  if (produto.capaUrl) {
    images.push({
      id: `${produto.id}-capa`,
      url: produto.capaUrl,
      alt: `Capa do produto ${produto.nome}`,
      ordem: -1,
    });
    seenUrls.add(produto.capaUrl);
  }

  for (const foto of produto.fotos) {
    if (!foto.url || seenUrls.has(foto.url)) {
      continue;
    }

    images.push({
      id: foto.id,
      url: foto.url,
      alt: foto.legenda || `Foto do produto ${produto.nome}`,
      ordem: foto.ordem,
    });
    seenUrls.add(foto.url);
  }

  return images.sort((a, b) => a.ordem - b.ordem);
}

export default function ProductDetailClient({ produtoId }: ProductDetailClientProps) {
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoadingProduto, setIsLoadingProduto] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadProduto = async () => {
      if (!produtoId) {
        setErrorMessage("Produto nao informado para visualizacao.");
        setIsLoadingProduto(false);
        return;
      }

      try {
        const response = await fetch(`/api/produtos/${encodeURIComponent(produtoId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(resolveErrorMessage(payload, "Nao foi possivel carregar o produto selecionado."));
        }

        const normalizedProduto = normalizeProduto(payload);

        if (!normalizedProduto) {
          throw new Error("Resposta invalida ao carregar produto.");
        }

        if (!isCancelled) {
          setProduto(normalizedProduto);
          setErrorMessage("");
          setSelectedImageIndex(0);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Erro inesperado ao carregar o produto.",
          );
          setProduto(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProduto(false);
        }
      }
    };

    void loadProduto();

    return () => {
      isCancelled = true;
    };
  }, [produtoId]);

  const galleryImages = useMemo(() => (produto ? buildGalleryImages(produto) : []), [produto]);
  const selectedImage = galleryImages[selectedImageIndex] ?? null;

  useEffect(() => {
    if (selectedImageIndex > galleryImages.length - 1) {
      setSelectedImageIndex(0);
    }
  }, [galleryImages.length, selectedImageIndex]);

  const handleCheckout = async () => {
    if (!produto || isCreatingCheckout) {
      return;
    }

    if (!produto.ativo) {
      setErrorMessage("Este produto esta inativo e nao pode ser vendido.");
      return;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
    const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

    if (!token) {
      setErrorMessage("Faca login para continuar com a compra.");
      return;
    }

    const authorizationHeader = `${tokenType} ${token}`;

    setIsCreatingCheckout(true);
    setErrorMessage("");

    try {
      const enderecoResponse = await fetch("/api/usuarios/me/endereco", {
        method: "GET",
        headers: { Authorization: authorizationHeader },
        cache: "no-store",
      });

      if (enderecoResponse.status === 401) {
        setErrorMessage("Sessao expirada. Faca login novamente para continuar.");
        setIsCreatingCheckout(false);
        return;
      }

      if (enderecoResponse.status === 404) {
        setErrorMessage("Cadastre seu endereco de entrega antes de comprar. Redirecionando...");
        router.push("/minhas-compras");
        return;
      }

      if (!enderecoResponse.ok) {
        const enderecoPayload = (await enderecoResponse.json().catch(() => null)) as unknown;
        throw new Error(resolveErrorMessage(enderecoPayload, "Nao foi possivel validar seu endereco."));
      }

      const enderecoPayload = (await enderecoResponse.json().catch(() => null)) as Record<string, unknown> | null;
      const requiredFields = ["logradouro", "numero", "bairro", "cidade", "estado", "cep"] as const;
      const hasEnderecoCompleto = !!enderecoPayload &&
        requiredFields.every((field) => {
          const value = enderecoPayload[field];
          return typeof value === "string" && value.trim().length > 0;
        });

      if (!hasEnderecoCompleto) {
        setErrorMessage("Complete seu endereco de entrega antes de comprar. Redirecionando...");
        router.push("/minhas-compras");
        return;
      }

      const response = await fetch("/api/pagamentos/produtos/checkout-pro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify({ produtoId: produto.id }),
      });

      const payload = (await response.json().catch(() => null)) as ApiPayload | null;

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, "Nao foi possivel iniciar checkout do produto no Mercado Pago."));
      }

      const checkoutUrl = typeof payload?.checkout_url === "string" ? payload.checkout_url.trim() : "";

      if (!checkoutUrl) {
        throw new Error("URL de checkout nao retornada pelo Mercado Pago.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao iniciar checkout do produto.",
      );
      setIsCreatingCheckout(false);
    }
  };

  if (isLoadingProduto) {
    return <div className={styles.statePanel}>Carregando detalhes do produto...</div>;
  }

  if (errorMessage && !produto) {
    return (
      <div className={styles.statePanel}>
        <p className={styles.error}>{errorMessage}</p>
        <Link href="/produtos" className="btn btn-soft">
          Voltar para produtos
        </Link>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className={styles.statePanel}>
        <p className={styles.error}>Produto nao encontrado.</p>
        <Link href="/produtos" className="btn btn-soft">
          Voltar para produtos
        </Link>
      </div>
    );
  }

  const isAvailable = typeof produto.ativo === "boolean" ? produto.ativo : true;
  const productDescription =
    produto.descricao?.trim() || "Sem descricao cadastrada para este produto no momento.";

  return (
    <div className={styles.detailStack}>
      <section className={styles.sheet}>
        <div className={styles.mediaArea}>
          <div className={styles.mediaGrid}>
            {galleryImages.length > 1 ? (
              <div className={styles.thumbColumn}>
                {galleryImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className={`${styles.thumbButton} ${index === selectedImageIndex ? styles.thumbButtonActive : ""}`}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Selecionar imagem ${index + 1}`}
                  >
                    <img src={image.url} alt={image.alt} />
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.mainMedia}>
              {selectedImage ? (
                <img src={selectedImage.url} alt={selectedImage.alt} />
              ) : (
                <span>Nenhuma foto cadastrada para este produto.</span>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.buyArea}>
          <small className={styles.badge}>Produto avulso</small>
          <h2>{produto.nome}</h2>
          <strong className={styles.price}>{formatCurrency(produto.preco, produto.moeda)}</strong>
          <p className={styles.shortDescription}>{productDescription}</p>

          <ul className={styles.metaList}>
            <li>Status: {isAvailable ? "Disponivel" : "Indisponivel"}</li>
            <li>Pagamento com Mercado Pago</li>
            <li>{galleryImages.length} foto(s) no anuncio</li>
          </ul>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" onClick={handleCheckout} disabled={isCreatingCheckout || !isAvailable}>
              {isCreatingCheckout ? "Redirecionando..." : "Comprar agora"}
            </button>
            <Link href="/produtos" className="btn btn-soft">
              Voltar para produtos
            </Link>
          </div>
        </aside>
      </section>

      <section className={styles.descriptionPanel}>
        <h3>Descricao completa</h3>
        <p>{productDescription}</p>
      </section>

      {galleryImages.length > 1 ? (
        <section className={styles.galleryPanel}>
          <h3>Todas as fotos do produto</h3>
          <div className={styles.galleryGrid}>
            {galleryImages.map((image, index) => (
              <button
                key={`${image.id}-gallery`}
                type="button"
                className={styles.galleryButton}
                onClick={() => setSelectedImageIndex(index)}
                aria-label={`Abrir foto ${index + 1}`}
              >
                <img src={image.url} alt={image.alt} />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

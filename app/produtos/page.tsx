import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import ProductsCatalog from "@/app/components/products-catalog";
import styles from "./page.module.css";

const perks = [
  "Checkout rapido com Mercado Pago",
  "Produtos avulsos sem vinculo com assinatura",
  "Catalogo com fotos de capa e galeria",
];

export default function ProdutosPage() {
  return (
    <div className={styles.page}>
      <div className="home-noise" aria-hidden="true" />

      <header className="home-header">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p>Loja avulsa</p>
          <h1>Compre produtos separados do clube de assinatura.</h1>
          <span>
            Aqui voce encontra itens avulsos com pagamento individual. Administradoras podem cadastrar produtos, capa,
            galeria de fotos e preco diretamente nesta area.
          </span>
        </section>

        <ProductsCatalog />

        <section className={styles.perks}>
          <h3>Diferenciais da loja</h3>
          <div className={styles.perkList}>
            {perks.map((perk) => (
              <span key={perk}>{perk}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import HeaderAuthActions from "@/app/components/header-auth-actions";
import HeaderNavigation from "@/app/components/header-navigation";
import HeroSliderAdminPanel from "@/app/components/hero-slider-admin-panel";

export default function HeroSliderAdminPage() {
  return (
    <div className="home-page admin-slider-page">
      <div className="home-noise" aria-hidden="true" />

      <header className="home-header reveal reveal-0">
        <Link href="/" className="brand-link" aria-label="Clube das Jovens Senhoras">
          <Image src="/logo.png" alt="Logo Clube das Jovens Senhoras" width={210} height={108} priority />
        </Link>

        <HeaderNavigation />

        <HeaderAuthActions />
      </header>

      <main className="admin-slider-main">
        <HeroSliderAdminPanel />
      </main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import EventsDynamicContent from "../components/events-dynamic-content";
import HeaderAuthActions from "../components/header-auth-actions";
import HeaderNavigation from "../components/header-navigation";
import HomeIntroOverlay from "../components/home-intro-overlay";

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

      <EventsDynamicContent />
    </div>
  );
}

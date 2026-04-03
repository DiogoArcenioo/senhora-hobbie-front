"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_SESSION_EVENT, hasAuthSessionToken } from "@/app/lib/auth-session";

type NavLink = {
  href: string;
  label: string;
};

const LOGGED_OUT_LINKS: NavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/eventos", label: "Eventos" },
  { href: "/como-funciona", label: "Como Funciona" },
  { href: "/#contato", label: "Contato" },
];

const LOGGED_IN_LINKS: NavLink[] = [
  { href: "/eventos", label: "Eventos" },
  { href: "/assinatura", label: "Assinatura" },
  { href: "/#contato", label: "Contato" },
];

export default function HeaderNavigation() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      setIsLoggedIn(hasAuthSessionToken());
    };

    syncSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const links = isLoggedIn ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;

  return (
    <nav className="home-nav" aria-label="Navegacao principal">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={pathname === link.href ? "is-active" : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

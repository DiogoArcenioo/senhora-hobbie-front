"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  hasAuthSessionToken,
} from "@/app/lib/auth-session";

type NavLink = {
  href: string;
  label: string;
};

const LOGGED_OUT_LINKS: NavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/eventos", label: "Eventos" },
  { href: "/produtos", label: "Produtos" },
  { href: "/como-funciona", label: "Como Funciona" },
  { href: "/#contato", label: "Contato" },
];

const LOGGED_IN_LINKS: NavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/eventos", label: "Eventos" },
  { href: "/produtos", label: "Produtos" },
  { href: "/assinatura", label: "Assinatura" },
  { href: "/#contato", label: "Contato" },
];

const LOGGED_IN_ADMIN_LINKS: NavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/eventos", label: "Eventos" },
  { href: "/produtos", label: "Produtos" },
  { href: "/assinatura", label: "Assinatura" },
  { href: "/admin/hero-slider", label: "Admin" },
  { href: "/admin/gestao-assinaturas", label: "Gestao Assinaturas" },
  { href: "/#contato", label: "Contato" },
];

type AuthUser = {
  tipo?: string;
};

type JwtPayload = {
  tipo?: string;
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

function hasAdminProfile(): boolean {
  const user = readAuthUser();
  const adminFromStorage = typeof user?.tipo === "string" && user.tipo.trim().toUpperCase() === "ADM";

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  const jwtPayload = decodeJwtPayload(token);
  const adminFromToken =
    typeof jwtPayload?.tipo === "string" && jwtPayload.tipo.trim().toUpperCase() === "ADM";

  return adminFromStorage || adminFromToken;
}

export default function HeaderNavigation() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const loggedIn = hasAuthSessionToken();
      setIsLoggedIn(loggedIn);
      setIsAdmin(loggedIn ? hasAdminProfile() : false);
    };

    syncSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const links = isLoggedIn ? (isAdmin ? LOGGED_IN_ADMIN_LINKS : LOGGED_IN_LINKS) : LOGGED_OUT_LINKS;

  return (
    <nav className="home-nav" aria-label="Navegacao principal">
      {links.map((link) => {
        const normalizedHref = link.href.split("#")[0];
        const isRootLink = normalizedHref === "/";
        const isActive = isRootLink
          ? pathname === "/" && link.href === "/"
          : pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);

        return (
          <Link key={link.href} href={link.href} className={isActive ? "is-active" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

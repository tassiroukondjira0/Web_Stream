"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Film, Tv, Sparkles, Clock } from "lucide-react";
import { NavSearch } from "@/components/NavSearch";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationBell } from "@/components/NotificationBell";

const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/films", label: "Films", icon: Film },
  { href: "/series", label: "Séries", icon: Tv },
  { href: "/animes", label: "Animés", icon: Sparkles },
  { href: "/nouveautes", label: "Nouveautés", icon: Clock },
];

/** Style streamix : boutons avec icônes, état actif avec fond subtil */
const navButtonBase = "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200";
const navButtonInactive = `${navButtonBase} text-zinc-400 hover:text-white hover:bg-white/5`;
const navButtonActive = `${navButtonBase} text-white bg-white/10`;

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Ferme le menu burger à chaque navigation + verrouille le scroll quand ouvert.
  useEffect(() => {
    const id = setTimeout(() => setMenuOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (pathname === "/admin") return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Logo & Navigation */}
        <div className="flex min-w-0 items-center gap-4 md:gap-8">
          {/* Burger — mobile uniquement */}
          <div ref={menuRef} className="md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {menuOpen && (
              <nav
                aria-label="Navigation principale"
                className="absolute left-2 right-2 top-16 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
              >
                <div className="py-2">
                  {NAV_LINKS.map((link) => {
                    const active =
                      link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          active
                            ? "text-white bg-white/10"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-zinc-500"}`} />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}
          </div>

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl"
          >
          <Image src="/logo.svg" alt="CinéMax" width={36} height={36} className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <span className="truncate bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              CinéMax
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? navButtonActive : navButtonInactive}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-colors" />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions utilisateur & Recherche */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <NavSearch />
          <NotificationBell />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

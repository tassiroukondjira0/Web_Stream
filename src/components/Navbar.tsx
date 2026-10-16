"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Film, Tv, Sparkles, Clock } from "lucide-react";
import { NavSearch } from "@/components/NavSearch";
import { AccountMenu } from "@/components/AccountMenu";

const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/films", label: "Films", icon: Film },
  { href: "/series", label: "Séries", icon: Tv },
  { href: "/animes", label: "Animés", icon: Sparkles },
  { href: "/nouveautes", label: "Nouveautés", icon: Clock },
];

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
                <ul className="py-2">
                  {NAV_LINKS.map((link) => {
                    const active =
                      link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                            active
                              ? "bg-violet-600/10 text-white"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <link.icon
                            className={`h-4 w-4 ${active ? "text-violet-500" : "text-zinc-500"}`}
                          />
                          {link.label}
                          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl"
          >
            <img src="/logo.svg" alt="CinéMax" className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <span className="truncate bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              CinéMax
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-300 md:flex">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-1 transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-violet-500 after:transition-transform after:duration-300 hover:text-white ${
                    active ? "text-white after:scale-x-100" : "after:scale-x-0"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions utilisateur & Recherche */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <NavSearch />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { Film, PlaySquare, Search, User, ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 font-black text-white shadow-lg shadow-red-600/30">
              S
            </span>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              StreamWeb
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            <Link href="/" className="transition-colors hover:text-white">
              Accueil
            </Link>
            <Link href="/films" className="transition-colors hover:text-white">
              Films
            </Link>
            <Link href="/series" className="transition-colors hover:text-white">
              Séries
            </Link>
            <Link href="/nouveautes" className="transition-colors hover:text-white">
              Nouveautés
            </Link>
          </nav>
        </div>

        {/* Actions utilisateur & Recherche */}
        <div className="flex items-center gap-4">
          <Link
            href="/recherche"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </Link>

          <Link
            href="/premium"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-semibold text-black shadow-md hover:brightness-110"
          >
            <ShieldCheck className="h-4 w-4" />
            Pass Premium
          </Link>

          <Link
            href="/connexion"
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Mon Compte</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

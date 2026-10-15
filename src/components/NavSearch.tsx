"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Barre de recherche de la navigation. Discrète par défaut (icône), elle
 * révèle un champ au clic. Le formulaire pointe vers `/recherche` en GET :
 * fonctionne même sans JavaScript et partage l'URL (résultats partageables).
 */
export function NavSearch() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la recherche"
        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  return (
    <form
      action="/recherche"
      method="GET"
      className="flex max-w-[46vw] items-center gap-1 rounded-full border border-white/10 bg-zinc-900 pl-3 pr-1 focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/40"
    >
      <Search className="h-4 w-4 shrink-0 text-zinc-400" />
      <input
        type="search"
        name="q"
        autoFocus
        placeholder="Rechercher…"
        aria-label="Rechercher un film ou une série"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-24 min-w-0 bg-transparent py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none sm:w-48"
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Fermer la recherche"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

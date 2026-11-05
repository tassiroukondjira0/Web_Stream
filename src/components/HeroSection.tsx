"use client";

import { Search } from "lucide-react";
import Link from "next/link";

/**
 * Hero section immersive inspiré de streamix.ca.
 * Affiche un message de bienvenue avec un fond sombre et une vignette,
 * plus un bouton d'exploration.
 */
export function HeroSection() {
  return (
    <section className="relative mt-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Conteneur principal */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950">
        {/* Arrière-plan décoratif — vignette */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950/40" />
          {/* Glow subtil */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        {/* Contenu */}
        <div className="relative z-10 px-6 py-16 sm:px-10 sm:py-24 lg:px-16 lg:py-32">
          {/* Kicker */}
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500" />
            Bienvenue chez vous
          </p>

          {/* Titre principal */}
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Vos prochains{" "}
            <i className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
              coups de cœur.
            </i>
          </h1>

          {/* Description */}
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
            Votre univers de films, séries, anime et K-Dramas en streaming.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/films"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition-colors hover:bg-zinc-200"
            >
              <Search className="h-4 w-4" />
              Explorer les contenus
            </Link>
            <Link
              href="/nouveautes"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Voir les nouveautés
            </Link>
          </div>

          {/* Crédit */}
          <p className="mt-8 text-xs text-zinc-500">
            Une CinéMax production
          </p>
        </div>

        {/* Indicateur de scroll */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-zinc-500">
          <span className="text-[10px] uppercase tracking-widest">Explorer</span>
          <div className="h-8 w-px overflow-hidden">
            <div className="h-full w-full animate-pulse bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

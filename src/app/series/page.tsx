import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getAllMedias } from "@/lib/catalog";
import { Tv, Play, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Séries & Documentaires en Streaming",
  description: "Découvrez nos séries et documentaires par épisodes en haute définition.",
};

async function SeriesContent() {
  const allMedias = await getAllMedias();
  const seriesList = allMedias.filter((m) => m.type === "SERIES");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Séries & Épisodes
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Suivez vos séries originales, documentaires et programmes par saisons.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {seriesList.map((serie) => (
          <Link
            key={serie.slug}
            href={`/series/${serie.slug}`}
            className="group overflow-hidden rounded-2xl bg-zinc-900/60 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
              <img
                src={serie.backdropUrl || serie.posterUrl}
                alt={serie.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  <Play className="h-3 w-3 fill-white" />
                  Voir les épisodes
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Tv className="h-3 w-3 text-red-500" />
                  Série
                </span>
                <span>•</span>
                <span>{serie.releaseYear}</span>
              </div>
              <h2 className="mt-1 text-base font-bold text-white group-hover:text-red-400 transition-colors">
                {serie.title}
              </h2>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {serie.synopsis}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SeriesCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement des séries...
        </div>
      }
    >
      <SeriesContent />
    </Suspense>
  );
}

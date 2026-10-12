import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getAllMedias } from "@/lib/catalog";
import { Sparkles, Calendar, Play, ShieldCheck, Film } from "lucide-react";

export const metadata: Metadata = {
  title: "Nouveautés & Sorties Récentes — Streaming Vidéo",
  description: "Découvrez les dernières nouveautés ajoutées au catalogue de streaming légal.",
};

async function NouveautesContent() {
  const medias = await getAllMedias();
  // Tri par année décroissante
  const sorted = [...medias].sort((a, b) => b.releaseYear - a.releaseYear);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Calendrier des sorties
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Derniers ajouts au catalogue
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Les nouvelles créations et ajouts récents vérifiés et autorisés pour la diffusion.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
        {sorted.map((item) => (
          <Link
            key={item.slug}
            href={`/films/${item.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900/60 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl"
          >
            <div className="absolute top-2.5 right-2.5 z-10">
              {item.accessLevel === "PREMIUM" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
                  <ShieldCheck className="h-3 w-3" />
                  PREMIUM
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
                  GRATUIT
                </span>
              )}
            </div>

            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
              <img
                src={item.posterUrl}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  <Play className="h-3 w-3 fill-white" />
                  Regarder
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-3">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {item.releaseYear}
                </span>
                {item.durationMinutes && <span>• {item.durationMinutes} min</span>}
              </div>
              <h2 className="mt-1 text-sm font-semibold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                {item.title}
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {item.categories.map((c) => c.name).join(" • ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function NouveautesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement des nouveautés...
        </div>
      }
    >
      <NouveautesContent />
    </Suspense>
  );
}

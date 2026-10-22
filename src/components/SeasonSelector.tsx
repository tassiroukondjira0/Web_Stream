"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Play, Tv } from "lucide-react";

interface SeasonCard {
  season: number;
  episodes: number[];
  posterUrl?: string | null;
}

interface SeasonSelectorProps {
  seasons: SeasonCard[];
  currentSeason: number | null;
  seriesPoster?: string | null;
}

export function SeasonSelector({
  seasons,
  currentSeason,
  seriesPoster,
}: SeasonSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectSeason = useCallback(
    (season: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (season === null) {
        params.delete("season");
      } else {
        params.set("season", String(season));
      }
      // Réinitialise l'épisode quand on change de saison
      params.delete("ep");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (!seasons || seasons.length === 0) return null;

  const isSelected = (season: number | null) =>
    currentSeason !== null && season !== null && currentSeason === season;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Saisons
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {seasons.map((s) => {
          const poster = s.posterUrl ?? seriesPoster ?? null;
          const epCount = s.episodes.length;
          const selected = isSelected(s.season);

          return (
            <button
              key={s.season}
              onClick={() => selectSeason(s.season)}
              aria-pressed={selected}
              className={`relative group rounded-xl border overflow-hidden p-1.5 transition-all text-left ${
                selected
                  ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50 shadow-lg shadow-violet-500/10"
                  : "border-white/10 bg-zinc-900/50 hover:border-white/30 hover:bg-zinc-800/60"
              }`}
            >
              <div className="aspect-[3/4] bg-zinc-800/40 relative overflow-hidden rounded-lg">
                {poster ? (
                  <img
                    src={poster}
                    alt={`Saison ${s.season}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-zinc-800/80 to-zinc-900 text-xs text-zinc-500">
                    Aucune affiche
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
                {/* Badge numéro de saison */}
                <div className="absolute left-2 top-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-xs font-bold text-white border border-white/10">
                  <span>S{s.season}</span>
                </div>
                {/* Badge nombre d'épisodes sur l'affiche */}
                <div className="absolute right-2 top-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-950/80 backdrop-blur-sm text-[11px] font-bold text-violet-300 border border-violet-500/30">
                  <span>{epCount} ép.</span>
                </div>
              </div>

              {/* Titre et badge du nombre d'épisodes sous l'affiche */}
              <div className="mt-2 px-1 pb-1 text-center">
                <span className="block text-xs font-semibold text-zinc-200">
                  Saison {s.season}
                </span>
                <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                  <Tv className="h-2.5 w-2.5" />
                  {epCount} épisode{epCount > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

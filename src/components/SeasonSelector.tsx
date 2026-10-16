"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Play } from "lucide-react";

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
        Saison
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {seasons.map((s) => {
          const poster = s.posterUrl ?? seriesPoster ?? null;
          return (
            <button
              key={s.season}
              onClick={() => selectSeason(s.season)}
              aria-pressed={isSelected(s.season)}
              className={`relative group rounded-xl border overflow-hidden transition-all ${
                isSelected(s.season)
                  ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50"
                  : "border-white/10 bg-zinc-900/50 hover:border-white/30"
              }`}
            >
              <div className="aspect-[3/4] bg-zinc-800/40 relative overflow-hidden">
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
                  <Play className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute left-2 top-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
                  <span>S{s.season}</span>
                </div>
              </div>
              <div className="mt-2 px-2 text-center">
                <span className="block text-xs font-medium text-zinc-200">
                  Saison {s.season}
                </span>
                <span className="block text-[10px] text-zinc-500">
                  {s.episodes.length} épisode{s.episodes.length > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

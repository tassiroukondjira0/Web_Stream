"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface SeasonSelectorProps {
  seasons: { season: number; episodes: number[] }[];
  currentSeason: number | null;
}

export function SeasonSelector({ seasons, currentSeason }: SeasonSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const season = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (season === "") {
        params.delete("season");
      } else {
        params.set("season", season);
      }
      // Réinitialise l'épisode quand on change de saison
      params.delete("ep");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (!seasons || seasons.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider sm:whitespace-nowrap">
        Saison
      </label>
      <select
        value={currentSeason ? String(currentSeason) : ""}
        onChange={handleChange}
        className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors cursor-pointer min-w-[120px]"
      >
        <option value="">Toutes les saisons</option>
        {seasons.map((s) => (
          <option key={s.season} value={String(s.season)}>
            Saison {s.season}
          </option>
        ))}
      </select>
    </div>
  );
}

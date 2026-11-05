"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Flame, Swords, Heart, Sparkles, Eye, Compass, Tv, Clapperboard, X } from "lucide-react";

/**
 * Genre chips horizontaux inspirés de streamix.ca.
 * Filtre le catalogue de la page d'accueil par genre via les search params.
 */
interface GenreChipDef {
  genre: string | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GENRE_CHIPS: GenreChipDef[] = [
  { genre: null, label: "Tous", icon: Flame },
  { genre: "action", label: "Action", icon: Swords },
  { genre: "romance", label: "Romance", icon: Heart },
  { genre: "animation", label: "Animation", icon: Sparkles },
  { genre: "horreur", label: "Horreur", icon: Eye },
  { genre: "fantastique", label: "Fantastique", icon: Compass },
  { genre: "comedie", label: "Comédie", icon: Sparkles },
  { genre: "drame", label: "Drame", icon: Eye },
  { genre: "thriller", label: "Thriller", icon: Swords },
  { genre: "science-fiction", label: "Sci-Fi", icon: Compass },
  { genre: "documentaire", label: "Documentaire", icon: Tv },
  { genre: "aventure", label: "Aventure", icon: Clapperboard },
];

export function GenreChips({ activeGenre }: { activeGenre?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string | null>(activeGenre || null);

  useEffect(() => {
    setSelected(activeGenre || null);
  }, [activeGenre]);

  const handleSelect = useCallback(
    (genre: string | null) => {
      setSelected(genre);
      const params = new URLSearchParams(searchParams.toString());
      if (genre) {
        params.set("genre", genre);
      } else {
        params.delete("genre");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Titre de section */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            À votre rythme
          </span>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
            Que voulez-vous regarder ?
          </h2>
          {selected && (
            <p className="mt-1 text-xs text-zinc-400">
              Filtre actif :{" "}
              <span className="font-medium text-purple-400">
                {GENRE_CHIPS.find((g) => g.genre === selected)?.label ?? selected}
              </span>
            </p>
          )}
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Chips de genre */}
      <nav
        aria-label="Explorer par genre"
        className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {GENRE_CHIPS.map((chip) => {
          const Icon = chip.icon;
          const isActive = selected === chip.genre;
          return (
            <button
              key={chip.genre ?? "all"}
              type="button"
              onClick={() => handleSelect(chip.genre)}
              className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "border-purple-500/50 bg-purple-500/20 text-white shadow-sm shadow-purple-500/20"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? "bg-purple-500/30 text-white"
                    : "bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              {chip.label}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

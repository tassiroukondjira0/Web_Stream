import Link from "next/link";
import type { TmdbEpisode } from "@/lib/tmdb";
import { TMDB_IMG } from "@/lib/tmdb";

interface EpisodeGridProps {
  /** Numéro de la saison affichée (pour l'affichage du titre). */
  seasonNumber: number;
  /** Épisodes de la saison (déjà enrichis depuis TMDB). */
  episodes: TmdbEpisode[];
  /** Construit l'URL de l'épisode. */
  hrefFor: (selection: { season: number; episode: number; lang?: string | null }) => string;
  /** Langue courante pour l'URL. */
  lang?: string | null;
}

export function EpisodeGrid({
  seasonNumber,
  episodes,
  hrefFor,
  lang,
}: EpisodeGridProps) {
  if (!episodes || episodes.length === 0) return null;

  return (
    <section className="mt-12 border-t border-white/10 pt-8">
      <h2 className="text-xl font-bold text-white mb-6">
        Épisode{episodes.length > 1 ? "s" : ""} · Saison {seasonNumber}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {episodes.map((ep) => {
          const still = ep.still_path
            ? `${TMDB_IMG}/w300${ep.still_path}`
            : null;
          return (
            <Link
              key={ep.episode_number}
              href={hrefFor({
                season: seasonNumber,
                episode: ep.episode_number,
                lang: lang ?? undefined,
              })}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900/60 p-3 transition-all hover:border-white/30 hover:bg-zinc-800"
            >
              <div className="aspect-[16/9] overflow-hidden rounded-lg bg-zinc-800">
                {still ? (
                  <img
                    src={still}
                    alt={`S${seasonNumber}E${ep.episode_number} — ${ep.name}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-zinc-800/40 text-xs text-zinc-500">
                    Aucune image
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  S{seasonNumber}E{ep.episode_number}
                </span>
                <h3 className="text-sm font-semibold text-zinc-200 leading-tight line-clamp-2">
                  {ep.name}
                </h3>
                {ep.overview && (
                  <p className="text-[11px] leading-relaxed text-zinc-400 line-clamp-2 mt-1">
                    {ep.overview}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

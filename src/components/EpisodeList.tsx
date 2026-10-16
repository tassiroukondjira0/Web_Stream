import Link from "next/link";
import type { TmdbEpisode } from "@/lib/tmdb";
import { TMDB_IMG } from "@/lib/tmdb";

interface EpisodeListProps {
  /** Numéro de la saison affichée (pour l'en-tête de section). */
  seasonNumber: number;
  /** Épisodes de la saison (déjà enrichis depuis TMDB ou fallback). */
  episodes: TmdbEpisode[];
  /** Construit l'URL de l'épisode. */
  hrefFor: (selection: { season: number; episode: number; lang?: string | null }) => string;
  /** Langue courante pour l'URL. */
  lang?: string | null;
}

export function EpisodeList({
  seasonNumber,
  episodes,
  hrefFor,
  lang,
}: EpisodeListProps) {
  if (!episodes || episodes.length === 0) return null;

  return (
    <section className="mt-8 border border-white/10 rounded-xl bg-zinc-900/40 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4">
        Saison {seasonNumber} — {episodes.length} épisode{episodes.length > 1 ? "s" : ""}
      </h2>
      <ul className="divide-y divide-white/5">
        {episodes.map((ep) => {
          const still = ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : null;
          return (
            <li key={ep.episode_number} className="p-3">
              <Link
                href={hrefFor({
                  season: seasonNumber,
                  episode: ep.episode_number,
                  lang: lang ?? undefined,
                })}
                className="flex items-start gap-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                {still ? (
                  <img
                    src={still}
                    alt={`S${seasonNumber}E${ep.episode_number}`}
                    className="h-16 w-11 shrink-0 rounded-md object-cover bg-zinc-800"
                  />
                ) : (
                  <div className="h-16 w-11 shrink-0 rounded-md bg-zinc-800/40 flex items-center justify-center text-xs text-zinc-500">
                    S{seasonNumber}E{ep.episode_number}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      S{seasonNumber}E{ep.episode_number}
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-200 leading-tight line-clamp-1">
                      {ep.name}
                    </h3>
                  </div>
                  {ep.overview && (
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
                      {ep.overview}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

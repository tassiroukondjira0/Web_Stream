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
    <section className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4">
        Saison {seasonNumber} — {episodes.length} épisode{episodes.length > 1 ? "s" : ""}
      </h2>
      <div className="space-y-3">
        {episodes.map((ep) => {
          const still = ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : null;
          return (
            <Link
              key={ep.episode_number}
              href={hrefFor({
                season: seasonNumber,
                episode: ep.episode_number,
                lang: lang ?? undefined,
              })}
              className="flex gap-4 rounded-xl border border-white/10 bg-zinc-900/40 p-3 hover:border-violet-500/40 hover:bg-zinc-900 transition-colors"
            >
              {still ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={still}
                  alt={`S${seasonNumber}E${ep.episode_number}`}
                  className="h-[5.625rem] w-40 shrink-0 rounded-lg object-cover bg-zinc-800"
                />
              ) : (
                <div className="flex h-[5.625rem] w-40 shrink-0 items-center justify-center rounded-lg bg-zinc-800/40 text-sm text-zinc-500">
                  S{seasonNumber}E{ep.episode_number}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-xs font-semibold text-violet-400 uppercase tracking-wider">
                    Épisode {ep.episode_number}
                  </span>
                  {ep.name && !/^Épisode\s+\d+$/i.test(ep.name) && (
                    <h3 className="text-sm font-semibold text-zinc-200 leading-tight line-clamp-1">
                      {ep.name}
                    </h3>
                  )}
                </div>
                {ep.overview && (
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 line-clamp-3">
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

import Link from "next/link";
import { Play } from "lucide-react";
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
  /** Numéro de l'épisode en cours de visionnage (placé au top). */
  activeEpisode?: number | null;
}

export function EpisodeList({
  seasonNumber,
  episodes,
  hrefFor,
  lang,
  activeEpisode,
}: EpisodeListProps) {
  if (!episodes || episodes.length === 0) return null;

  // Si un épisode est en cours, on le place au top (en tête de liste)
  const activeEp =
    activeEpisode != null
      ? episodes.find((e) => e.episode_number === activeEpisode) ?? null
      : null;
  const otherEpisodes = activeEp
    ? episodes.filter((e) => e.episode_number !== activeEp.episode_number)
    : episodes;

  const displayList = activeEp ? [activeEp, ...otherEpisodes] : episodes;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
            Saison {seasonNumber}
          </h2>
          {/* Badge nombre d'épisodes de la saison */}
          <span className="inline-flex items-center rounded-md bg-zinc-800 border border-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-300">
            {episodes.length} épisode{episodes.length > 1 ? "s" : ""}
          </span>
        </div>

        {activeEp && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-xs font-bold text-violet-300">
            <Play className="h-3 w-3 fill-violet-400 text-violet-400" />
            Épisode {activeEp.episode_number} en cours (au top)
          </span>
        )}
      </div>

      <div className="space-y-3">
        {displayList.map((ep) => {
          const isCurrent = activeEp?.episode_number === ep.episode_number;
          const still = ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : null;

          return (
            <Link
              key={ep.episode_number}
              href={hrefFor({
                season: seasonNumber,
                episode: ep.episode_number,
                lang: lang ?? undefined,
              })}
              className={`flex gap-4 rounded-xl border p-3 transition-all ${
                isCurrent
                  ? "border-violet-500 bg-violet-600/15 ring-1 ring-violet-500/50 shadow-lg shadow-violet-600/10"
                  : "border-white/10 bg-zinc-900/40 hover:border-violet-500/40 hover:bg-zinc-900"
              }`}
            >
              {still ? (
                // eslint-disable-next-line @next/next/no-img-element
                <div className="relative shrink-0">
                  <img
                    src={still}
                    alt={`S${seasonNumber}E${ep.episode_number}`}
                    className="h-[5.625rem] w-40 rounded-lg object-cover bg-zinc-800"
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-violet-950/40 rounded-lg flex items-center justify-center">
                      <div className="rounded-full bg-violet-600 p-1.5 text-white shadow-lg">
                        <Play className="h-4 w-4 fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`flex h-[5.625rem] w-40 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                    isCurrent
                      ? "bg-violet-900/40 text-violet-300 border border-violet-500/30"
                      : "bg-zinc-800/40 text-zinc-500"
                  }`}
                >
                  S{seasonNumber}E{ep.episode_number}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`shrink-0 text-xs font-bold uppercase tracking-wider ${
                      isCurrent ? "text-violet-300" : "text-violet-400"
                    }`}
                  >
                    Épisode {ep.episode_number}
                  </span>
                  {isCurrent && (
                    <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      En cours de lecture
                    </span>
                  )}
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

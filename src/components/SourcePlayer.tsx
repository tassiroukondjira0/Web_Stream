import Link from "next/link";
import { Play } from "lucide-react";
import type { PlayerSelection, PlayerSource } from "@/lib/player-sources";

/**
 * Lecteur multi-sources : iframe + sélecteurs langue / saison / épisode /
 * hébergeur rendus côté serveur. La navigation se fait par URL via `hrefFor`,
 * sans état client. Toutes les sources (Vidzy et iframes fournisseur) sont
 * fusionnées : pour un épisode donné, l'utilisateur peut changer d'hébergeur.
 */

interface SourcePlayerProps {
  sources: PlayerSource[];
  /** Construit l'URL de la page pour une nouvelle sélection. */
  hrefFor: (selection: PlayerSelection) => string;
  selection: PlayerSelection;
  /** Titre de l'iframe (accessibilité). */
  title: string;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function SourcePlayer({ sources, hrefFor, selection, title }: SourcePlayerProps) {
  const langs = unique(sources.map((s) => s.lang));
  const lang = selection.lang && langs.includes(selection.lang) ? selection.lang : langs[0];

  const langSources = sources.filter((s) => s.lang === lang);
  const seasons = uniqueSorted(langSources.map((s) => s.season));
  const season =
    selection.season && seasons.includes(selection.season) ? selection.season : seasons[0];

  const seasonSources = langSources.filter((s) => s.season === season);
  const episodes = uniqueSorted(seasonSources.map((s) => s.episode));
  const episode =
    selection.episode && episodes.includes(selection.episode) ? selection.episode : episodes[0];

  const episodeSources = seasonSources.filter((s) => s.episode === episode);
  const selected = episodeSources.find((s) => s.host === selection.host) ?? episodeSources[0];

  const isMovie = seasons.length === 1 && episodes.length === 1;

  return (
    <div className="mt-4">
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {selected ? (
          <iframe
            key={selected.url}
            src={selected.url}
            title={title}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Flux indisponible.
          </div>
        )}
      </div>

      {/* Hébergeurs disponibles pour la sélection courante (multi-choix). */}
      {episodeSources.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Sources
          </span>
          {episodeSources.map((s) => (
            <Link
              key={s.host}
              href={hrefFor({ lang, season, episode, host: s.host })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected && s.host === selected.host
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {/* Langues. */}
      {langs.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {langs.map((l) => (
            <Link
              key={l}
              href={hrefFor({ lang: l, season, episode, host: null })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                l === lang
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
      )}

      {/* Saisons. */}
      {seasons.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {seasons.map((s) => (
            <Link
              key={s}
              href={hrefFor({ lang, season: s, episode: 1, host: null })}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                s === season
                  ? "border-zinc-400 bg-zinc-700 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              Saison {s}
            </Link>
          ))}
        </div>
      )}

      {/* Épisodes. */}
      {!isMovie && (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Épisodes · {lang.toUpperCase()} ({episodes.length})
          </h2>
          <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {episodes.map((ep) => {
              const isCurrent = ep === episode;
              return (
                <li key={ep}>
                  <Link
                    href={hrefFor({ lang, season, episode: ep, host: null })}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isCurrent
                        ? "border-violet-500 bg-violet-600/20 text-white"
                        : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    {isCurrent ? (
                      <Play className="h-3.5 w-3.5 fill-white text-white" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                    <span>{ep}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
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

  const currentEpisodeIndex = episodes.indexOf(episode);
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1
      ? episodes[currentEpisodeIndex + 1]
      : null;

  // Keep alternatives from other language labels visible for the same episode.
  // Provider feeds often label the same dub differently from Vidzy.
  const episodeSources = sources.filter(
    (s) =>
      s.episode === episode &&
      (s.season === season || s.host.startsWith("ext:")),
  );
  const selected =
    episodeSources.find(
      (s) => s.host === selection.host && s.lang === lang,
    ) ??
    episodeSources.find((s) => s.lang === lang) ??
    episodeSources[0];

  const isMovie = seasons.length === 1 && episodes.length === 1;

  return (
    <div className="mt-4">
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black relative">
        {selected ? (
          <>
            <iframe
              key={selected.url}
              src={selected.url}
              title={title}
              className="h-full w-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {nextEpisode && !isMovie && (
              <Link
                href={hrefFor({ lang, season, episode: nextEpisode, host: null })}
                className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/90 text-white text-sm font-semibold shadow-xl backdrop-blur-sm transition-transform hover:bg-violet-600 hover:scale-105"
                aria-label={`Épisode ${nextEpisode}`}
              >
                {nextEpisode}
              </Link>
            )}
          </>
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
              key={`${s.host}:${s.lang}:${s.url}`}
              href={hrefFor({ lang: s.lang, season, episode, host: s.host })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected && s.host === selected.host && s.lang === selected.lang
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {s.label} · {s.lang.toUpperCase()}
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
    </div>
  );
}

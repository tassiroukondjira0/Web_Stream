import Link from "next/link";
import { VIDZY_HOST, type PlayerSelection, type PlayerSource } from "@/lib/player-sources";
import { EmbedFrame } from "@/components/EmbedFrame";
import { SourceSelect } from "@/components/SourceSelect";

/**
 * Lecteur multi-sources : iframe + sélecteurs langue / saison / épisode /
 * hébergeur rendus côté serveur. La navigation se fait par URL via `hrefFor`,
 * sans état client. Toutes les sources (Vidzy et iframes fournisseur) sont
 * fusionnées : pour un épisode donné, l'utilisateur peut changer d'hébergeur.
 *
 * Toute la logique interactive (rechargement du token, détection de blocage)
 * est isolée dans `EmbedFrame` (composant client) : on ne lui passe que des
 * propriétés sérialisables.
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
  const selectedByRequest = selection.host
    ? episodeSources.find(
      (s) => s.host === selection.host && s.lang === lang,
    )
    : undefined;
  const selected =
    selectedByRequest ??
    (!selection.host
      ? episodeSources.find((s) => s.host === VIDZY_HOST && s.lang === lang)
      : undefined) ??
    episodeSources.find((s) => s.lang === lang) ??
    episodeSources[0];

  const isMovie = seasons.length === 1 && episodes.length === 1;

  return (
    <div className="mt-4">
      {selected ? (
        <EmbedFrame
          src={selected.url}
          title={title}
          nextHref={
            nextEpisode && !isMovie
              ? hrefFor({ lang, season, episode: nextEpisode, host: null })
              : null
          }
          nextEpisode={nextEpisode}
          isMovie={isMovie}
        />
      ) : (
        <div className="aspect-video w-full flex items-center justify-center rounded-2xl border border-white/10 bg-black text-sm text-zinc-400">
          Flux indisponible.
        </div>
      )}

      {/* Hébergeurs disponibles pour la sélection courante (menu déroulant). */}
      {episodeSources.length > 1 && (() => {
        const seen = new Set<string>();
        const options = episodeSources
          .map((s) => ({
            value: hrefFor({ lang: s.lang, season, episode, host: s.host }),
            label: `${s.label} · ${s.lang.toUpperCase()}`,
          }))
          .filter((option) => {
            if (seen.has(option.value)) return false;
            seen.add(option.value);
            return true;
          });

        return (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Sources
            </span>
            <SourceSelect
              options={options}
              value={
                selected
                  ? hrefFor({
                      lang: selected.lang,
                      season,
                      episode,
                      host: selected.host,
                    })
                  : ""
              }
            />
          </div>
        );
      })()}

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

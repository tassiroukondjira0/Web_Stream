import { VIDZY_HOST, type PlayerSelection, type PlayerSource } from "@/lib/player-sources";
import { EmbedFrame } from "@/components/EmbedFrame";
import { SourceSelect } from "@/components/SourceSelect";

/**
 * Lecteur multi-sources : iframe + menus déroulants pour épisode / langue /
 * lecteur rendus côté serveur et synchronisés par URL via `hrefFor`.
 *
 * - Menu déroulant pour le choix de l'épisode (avec conservation de la liste complète d'épisodes en dessous).
 * - Menu déroulant pour le choix de la langue (« VF » et « VOSTFR »).
 * - Filtrage strict des lecteurs selon la langue active : si « VF » est sélectionné,
 *   seuls les lecteurs en VF s'affichent, et inversement pour « VOSTFR ».
 */

interface SourcePlayerProps {
  sources: PlayerSource[];
  /** Construit l'URL de la page pour une nouvelle sélection. */
  hrefFor: (selection: PlayerSelection) => string;
  selection: PlayerSelection;
  /** Titre de l'iframe (accessibilité). */
  title: string;
  /** Slug du titre (local ou partenaire) pour la reprise de lecture. */
  mediaSlug: string;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function formatLangLabel(langStr: string): string {
  const norm = (langStr ?? "").trim().toLowerCase();
  if (norm === "vf") return "VF";
  if (norm === "vostfr") return "VOSTFR";
  if (norm === "vo") return "VO";
  return langStr.toUpperCase();
}

export function SourcePlayer({ sources, hrefFor, selection, title, mediaSlug }: SourcePlayerProps) {
  // 1. Langues disponibles : triées avec priorité à VF puis VOSTFR
  const rawLangs = unique(sources.map((s) => s.lang.toLowerCase()));
  const langPriority = (l: string) => {
    if (l === "vf") return 1;
    if (l === "vostfr") return 2;
    if (l === "vo") return 3;
    return 4;
  };
  const langs = rawLangs.sort((a, b) => langPriority(a) - langPriority(b));

  const requestedLang = selection.lang?.toLowerCase();
  const lang =
    requestedLang && langs.includes(requestedLang)
      ? requestedLang
      : langs.includes("vf")
        ? "vf"
        : (langs[0] ?? "vf");

  // 2. Sources pour la langue active
  const langSources = sources.filter((s) => s.lang.toLowerCase() === lang);
  const activeSources = langSources.length > 0 ? langSources : sources;

  const seasons = uniqueSorted(activeSources.map((s) => s.season));
  const season =
    selection.season && seasons.includes(selection.season) ? selection.season : (seasons[0] ?? 1);

  const seasonSources = activeSources.filter((s) => s.season === season);
  const allSeasonSources = sources.filter((s) => s.season === season);
  const episodes = uniqueSorted(
    (seasonSources.length > 0 ? seasonSources : allSeasonSources).map((s) => s.episode),
  );
  const episode =
    selection.episode && episodes.includes(selection.episode)
      ? selection.episode
      : (episodes[0] ?? 1);

  const currentEpisodeIndex = episodes.indexOf(episode);
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1
      ? episodes[currentEpisodeIndex + 1]
      : null;

  // 3. Toutes les sources associées à cet épisode
  const episodeAllSources = sources.filter(
    (s) =>
      s.episode === episode &&
      (s.season === season || s.host.startsWith("ext:")),
  );

  // Filtrage strict par langue : si "VF" est sélectionné, seuls les lecteurs en VF
  // s'affichent, et si "VOSTFR" est sélectionné, seuls les lecteurs en VOSTFR s'affichent.
  const episodeSourcesForLang = episodeAllSources.filter(
    (s) => s.lang.toLowerCase() === lang,
  );
  const episodeSources =
    episodeSourcesForLang.length > 0 ? episodeSourcesForLang : episodeAllSources;

  // 4. Résolution de la source active
  const selectedByRequest = selection.host
    ? episodeSources.find(
        (s) => s.host === selection.host && s.lang.toLowerCase() === lang,
      ) ?? episodeSources.find((s) => s.host === selection.host)
    : undefined;

  const selected =
    selectedByRequest ??
    (!selection.host
      ? episodeSources.find((s) => s.host === VIDZY_HOST && s.lang.toLowerCase() === lang) ??
        episodeSources.find((s) => s.host === VIDZY_HOST)
      : undefined) ??
    episodeSources.find((s) => s.lang.toLowerCase() === lang) ??
    episodeSources[0];

  const isMovie = seasons.length <= 1 && episodes.length <= 1;

  // 5. Options du menu déroulant Épisode
  const episodeOptions = episodes.map((epNum) => ({
    value: hrefFor({ lang, season, episode: epNum, host: null }),
    label: `Épisode ${epNum}`,
  }));
  const currentEpisodeValue = hrefFor({ lang, season, episode, host: null });

  // 6. Options du menu déroulant Langue
  const langOptions = langs.map((l) => ({
    value: hrefFor({ lang: l, season, episode, host: null }),
    label: formatLangLabel(l),
  }));
  const currentLangValue = hrefFor({ lang, season, episode, host: null });

  // 7. Options du menu déroulant Lecteur (strictement filtrées pour la langue active)
  const seenHosts = new Set<string>();
  const sourceOptions = episodeSources
    .map((s) => ({
      value: hrefFor({ lang: s.lang.toLowerCase(), season, episode, host: s.host }),
      label: `${s.label} · ${formatLangLabel(s.lang)}`,
    }))
    .filter((option) => {
      if (seenHosts.has(option.value)) return false;
      seenHosts.add(option.value);
      return true;
    });

  const currentSourceValue = selected
    ? hrefFor({
        lang: selected.lang.toLowerCase(),
        season,
        episode,
        host: selected.host,
      })
    : "";

  const showEpisodeSelect = !isMovie && episodeOptions.length > 0;
  const showLangSelect = langOptions.length > 0;
  const showSourceSelect = sourceOptions.length > 0;
  const hasControls = showEpisodeSelect || showLangSelect || showSourceSelect;

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
          mediaSlug={mediaSlug}
          season={isMovie ? null : season}
          episode={isMovie ? null : episode}
        />
      ) : (
        <div className="aspect-video w-full flex items-center justify-center rounded-2xl border border-white/10 bg-black text-sm text-zinc-400">
          Flux indisponible.
        </div>
      )}

      {/* Barre des sélecteurs (Épisode, Langue, Lecteur) */}
      {hasControls && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-3 backdrop-blur-sm sm:gap-4">
          {/* Menu déroulant : Épisode */}
          {showEpisodeSelect && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Épisode
              </span>
              <SourceSelect
                options={episodeOptions}
                value={currentEpisodeValue}
                ariaLabel="Sélectionner l'épisode"
              />
            </div>
          )}

          {/* Menu déroulant : Langue (« VF », « VOSTFR ») */}
          {showLangSelect && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Langue
              </span>
              <SourceSelect
                options={langOptions}
                value={currentLangValue}
                ariaLabel="Sélectionner la langue de lecture"
              />
            </div>
          )}

          {/* Menu déroulant : Lecteur (filtré selon VF / VOSTFR) */}
          {showSourceSelect && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Lecteur
              </span>
              <SourceSelect
                options={sourceOptions}
                value={currentSourceValue}
                ariaLabel="Sélectionner le lecteur"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import type { TmdbEpisode } from "@/lib/tmdb";

/** Titre / synopsis d'un épisode quand TMDB n'en fournit pas. */
export interface EpisodeMeta {
  title?: string | null;
  synopsis?: string | null;
}

/**
 * Numéros d'épisodes réellement présents dans les sources de lecture d'une saison.
 * Sert de repli quand ni TMDB ni la grille Vidzy ne décrivent la saison.
 */
export function episodeNumbersForSeason(
  sources: { season: number; episode: number }[],
  season: number,
): number[] {
  return [
    ...new Set(
      sources
        .filter((source) => source.season === season && source.episode > 0)
        .map((source) => source.episode),
    ),
  ].sort((a, b) => a - b);
}

/**
 * Saison à lister quand la grille Vidzy ne connaît pas la saison demandée :
 * la saison préférée si des flux y existent, sinon la première saison qui a des épisodes.
 */
export function seasonForEpisodeList(
  preferred: number | null | undefined,
  sources: { season: number; episode: number }[],
): number {
  const seasons = [
    ...new Set(sources.filter((source) => source.episode > 0).map((source) => source.season)),
  ].sort((a, b) => a - b);
  if (preferred && preferred > 0 && seasons.includes(preferred)) return preferred;
  return seasons[0] ?? (preferred && preferred > 0 ? preferred : 1);
}

/**
 * Numéro de saison porté par le titre d'un asset fournisseur
 * (« Titre - Saison 3 », « Titre (Saison 2) »). Les fiches partenaire sont
 * publiées une par saison : ce numéro est la saison réellement vendue par la
 * fiche et doit primer sur la première saison du catalogue global.
 */
export function seasonNumberFromTitle(title: string | null | undefined): number | null {
  const match = (title ?? "").match(/\bsaison\s*(\d+)\b/i);
  if (!match) return null;
  const season = Number.parseInt(match[1], 10);
  return Number.isFinite(season) && season > 0 ? season : null;
}

/**
 * Saison active d'une fiche.
 *
 * 1. La saison demandée dans l'URL.
 * 2. La saison annoncée par le titre fournisseur (« … - Saison 3 »).
 * 3. La première saison réelle, en ignorant les épisodes spéciaux (saison 0)
 *    quand une saison numérotée existe.
 */
export function pickActiveSeason(
  requested: number | null,
  availableSeasons: number[],
  titleSeason?: number | null,
): number {
  if (requested !== null && Number.isFinite(requested) && requested >= 0) return requested;
  if (titleSeason !== null && titleSeason !== undefined && titleSeason > 0) return titleSeason;

  const seasons = [
    ...new Set(availableSeasons.filter((season) => Number.isFinite(season) && season >= 0)),
  ].sort((a, b) => a - b);
  const numbered = seasons.filter((season) => season > 0);
  return numbered[0] ?? seasons[0] ?? 1;
}

/**
 * Épisodes affichés sous le lecteur.
 *
 * 1. Métadonnées TMDB de la saison (titre, synopsis, image) quand elles existent.
 * 2. Sinon la grille Vidzy (numéros d'épisodes).
 * 3. Sinon les épisodes réellement exposés par les flux du fournisseur.
 *
 * On n'ajoute pas les numéros fournisseur à une grille TMDB/Vidzy déjà connue :
 * le partenaire publie une fiche par saison et ses flux sont parfois étiquetés
 * saison 1, ce qui polluerait les autres saisons.
 */
export function resolveDisplayedEpisodes(input: {
  tmdbEpisodes?: TmdbEpisode[] | null;
  gridEpisodes?: number[] | null;
  sourceEpisodes?: number[] | null;
  meta?: Record<number, EpisodeMeta> | null;
}): TmdbEpisode[] {
  const tmdb = (input.tmdbEpisodes ?? [])
    .filter((episode) => Number.isFinite(episode.episode_number) && episode.episode_number > 0)
    .sort((a, b) => a.episode_number - b.episode_number);

  if (tmdb.length > 0) {
    return tmdb.map((episode) => ({
      episode_number: episode.episode_number,
      name: episode.name?.trim() || `Épisode ${episode.episode_number}`,
      overview: episode.overview ?? null,
      still_path: episode.still_path ?? null,
    }));
  }

  const numbers =
    input.gridEpisodes && input.gridEpisodes.length > 0
      ? input.gridEpisodes
      : (input.sourceEpisodes ?? []);

  return [...new Set(numbers.filter((n) => Number.isFinite(n) && n > 0))]
    .sort((a, b) => a - b)
    .map((episodeNumber) => ({
      episode_number: episodeNumber,
      name: input.meta?.[episodeNumber]?.title?.trim() || `Épisode ${episodeNumber}`,
      overview: input.meta?.[episodeNumber]?.synopsis ?? null,
      still_path: null,
    }));
}

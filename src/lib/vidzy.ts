/**
 * Vidzy — lecteur de catalogue (API publique `vidzy.org`).
 *
 * Un titre se lit à partir de son identifiant TMDB : `/movie/{tmdb}` pour un
 * film, `/serie/{tmdb}/{saison}/{episode}` pour une série (animés inclus). L'API
 * `/api/{tmdb}` renvoie la disponibilité, le type détecté, les langues et la
 * grille saisons/épisodes — de quoi piloter tout le lecteur sans dépendre du
 * catalogue partenaire, dont les flux ont disparu.
 *
 * Toutes les erreurs sont absorbées (retour null) : une fiche reste affichable
 * même si la résolution échoue (CDC §11).
 */

import { resolveTmdbMatch } from "./tmdb";

const VIDZY_BASE = "https://vidzy.org";
const VIDZY_TIMEOUT_MS = 8000;

/** Accent violet du site (violet-600) — sans le `#`, comme attendu par Vidzy. */
export const VIDZY_ACCENT = "7c3aed";

export interface VidzySeason {
  season: number;
  episodes: number[];
}

/** Réponse de `GET vidzy.org/api/{tmdb}` (champs utiles). */
export interface VidzyAvailability {
  available: boolean;
  tmdbId: number;
  detectedType: "movie" | "tv" | null;
  title: string | null;
  year: number | null;
  poster: string | null;
  languages: string[];
  seasons: VidzySeason[];
}

/** Récupère la disponibilité et la grille de lecture d'un titre TMDB. */
export async function fetchVidzyAvailability(
  tmdbId: number | string,
): Promise<VidzyAvailability | null> {
  const id = String(tmdbId);
  if (!/^\d{1,10}$/.test(id)) return null;
  try {
    const res = await fetch(`${VIDZY_BASE}/api/${id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(VIDZY_TIMEOUT_MS),
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return mapAvailability(Number.parseInt(id, 10), data);
  } catch {
    return null;
  }
}

function mapAvailability(tmdbId: number, data: Record<string, unknown>): VidzyAvailability {
  const detected = data.detectedType;
  const seasons: VidzySeason[] = Array.isArray(data.seasons)
    ? (data.seasons as unknown[])
        .map((s) => {
          const entry = s as Record<string, unknown>;
          const season = Number(entry?.season);
          const episodes = Array.isArray(entry?.episodes)
            ? (entry.episodes as unknown[]).map((e) => Number(e)).filter((e) => Number.isFinite(e))
            : [];
          return { season, episodes };
        })
        .filter((s) => Number.isFinite(s.season))
    : [];
  const languages = Array.isArray(data.languages)
    ? (data.languages as unknown[]).filter((l): l is string => typeof l === "string")
    : [];

  return {
    available: data.available === true,
    tmdbId,
    detectedType: detected === "movie" || detected === "tv" ? detected : null,
    title: typeof data.title === "string" ? data.title : null,
    year: typeof data.year === "number" ? data.year : null,
    poster: typeof data.poster === "string" ? data.poster : null,
    languages,
    seasons,
  };
}

export interface VidzyEmbedOptions {
  /** Langue du flux : `vf` ou `vostfr` (segment de chemin facultatif). */
  lang?: string | null;
  autoplay?: boolean;
  autonext?: boolean;
  /** Accent en hex sans `#`. Défaut : violet du site. */
  color?: string | null;
}

/** Construit l'URL d'embed d'un film : `/movie/{tmdb}/{lang}?flags`. */
export function vidzyMovieUrl(tmdbId: number | string, options: VidzyEmbedOptions = {}): string {
  return buildVidzyUrl(`/movie/${tmdbId}`, options, false);
}

/** Construit l'URL d'embed d'une série : `/serie/{tmdb}/{saison}/{ep}/{lang}?flags`. */
export function vidzySeriesUrl(
  tmdbId: number | string,
  season: number,
  episode: number,
  options: VidzyEmbedOptions = {},
): string {
  return buildVidzyUrl(`/serie/${tmdbId}/${season}/${episode}`, options, true);
}

function buildVidzyUrl(path: string, options: VidzyEmbedOptions, isSeries: boolean): string {
  const lang = (options.lang ?? "").toLowerCase();
  const withLang = lang === "vf" || lang === "vostfr" ? `${path}/${lang}` : path;

  const params = new URLSearchParams();
  if (options.autoplay) params.set("autoplay", "1");
  if (isSeries && options.autonext) params.set("autonext", "1");
  params.set("color", options.color ?? VIDZY_ACCENT);

  return `${VIDZY_BASE}${withLang}?${params.toString()}`;
}

/** Lecture résolue pour un titre du catalogue externe. */
export interface CatalogPlayback {
  /** Type de lecture réel chez Vidzy. */
  kind: "movie" | "tv";
  tmdbId: number;
  available: boolean;
  title: string | null;
  year: number | null;
  poster: string | null;
  languages: string[];
  seasons: VidzySeason[];
}

/**
 * Résout la lecture Vidzy d'un titre du catalogue : identifiant TMDB (par titre
 * + année) puis disponibilité. Retourne null si le titre est introuvable.
 */
export async function resolveCatalogPlayback(
  title: string,
  contentType: "MOVIE" | "SERIES" | "ANIME",
  year?: number | null,
): Promise<CatalogPlayback | null> {
  const kind: "movie" | "tv" = contentType === "MOVIE" ? "movie" : "tv";
  const match = await resolveTmdbMatch(title, kind, year ?? null);
  if (!match) return null;

  const info = await fetchVidzyAvailability(match.id);
  if (!info) return null;

  return {
    kind: info.detectedType ?? kind,
    tmdbId: info.tmdbId,
    available: info.available,
    title: info.title,
    year: info.year ?? match.year,
    poster: info.poster,
    languages: info.languages,
    seasons: info.seasons,
  };
}

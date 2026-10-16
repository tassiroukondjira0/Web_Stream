/**
 * Client du catalogue TMDB (The Movie Database) — métadonnées uniquement.
 *
 * Alimente la synchro du catalogue « TMDB » : chaque film/série est stocké
 * comme `ProviderAsset` avec `externalId` = identifiant TMDB, ce qui permet une
 * lecture DIRECTE via Vidzy (sans résolution par titre, toujours approximative).
 * Les affiches sont servies par l'image CDN de TMDB.
 *
 * TMDB ne fournit AUCUNE vidéo : la lecture reste assurée par notre lecteur
 * (Vidzy), comme pour le reste du catalogue externe.
 */

import { fetchTmdbList, TMDB_GENRES, type TmdbMovie } from "@/lib/tmdb";

export const TMDB_PROVIDER = "TMDB";

const TMDB_IMG = "https://image.tmdb.org/t/p";

/** Liste TMDB à rapporter : chemin d'API (`/movie/popular`…) + type de contenu. */
export interface TmdbListSource {
  path: string;
  kind: "movie" | "tv";
}

/** Vignette normalisée prête pour `bulkUpsertProviderAssets`. */
export interface TmdbCatalogItem {
  externalId: string;
  contentType: "MOVIE" | "SERIES";
  sourceType: "movie" | "tv";
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  categorySlug: string | null;
}

/**
 * Convertit un élément TMDB brut en vignette de catalogue. Gère les deux formes
 * de champs (films : title/release_date ; séries : name/first_air_date).
 * Retourne null si l'élément est inexploitable (sans id ni titre).
 */
export function mapTmdbItem(item: TmdbMovie, kind: "movie" | "tv"): TmdbCatalogItem | null {
  const rawTitle = (kind === "movie" ? item.title : item.name) || item.title || item.name || "";
  const title = rawTitle.trim();
  if (!item.id || !title) return null;

  const rawDate =
    (kind === "movie" ? item.release_date : item.first_air_date) ||
    item.release_date ||
    item.first_air_date ||
    "";
  const year = rawDate ? Number.parseInt(rawDate.slice(0, 4), 10) : Number.NaN;

  const categorySlug =
    (item.genre_ids ?? []).map((id) => TMDB_GENRES[id]?.slug).find((s): s is string => Boolean(s)) ??
    null;

  return {
    externalId: String(item.id),
    contentType: kind === "movie" ? "MOVIE" : "SERIES",
    sourceType: kind,
    title,
    releaseYear: Number.isFinite(year) ? year : null,
    posterUrl: item.poster_path ? `${TMDB_IMG}/w500${item.poster_path}` : null,
    categorySlug,
  };
}

/** Récupère une page d'une liste TMDB et la normalise. Erreurs → tableau vide. */
export async function fetchTmdbCatalogPage(
  source: TmdbListSource,
  page: number,
): Promise<TmdbCatalogItem[]> {
  try {
    const data = await fetchTmdbList(source.path, page);
    return (data.results ?? [])
      .map((item) => mapTmdbItem(item, source.kind))
      .filter((item): item is TmdbCatalogItem => item !== null);
  } catch {
    return [];
  }
}

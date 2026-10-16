/**
 * Client TMDB (The Movie Database) — API légale de métadonnées.
 * Source officielle des titres, synopsis, affiches et genres.
 * Voir https://developer.themoviedb.org/docs
 *
 * ⚠️ TMDB fournit UNIQUEMENT des métadonnées (pas les fichiers vidéo).
 * Les fiches importées sont créées en BROUILLON (isPublished: false) :
 * l'administrateur doit ajouter une vidéo pour laquelle il détient les droits,
 * puis publier la fiche depuis le back-office.
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

/** Élément renvoyé par /movie/popular ou /tv/popular (champs utiles).
 *  Films : title / release_date. Séries : name / first_air_date. */
export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
}

export interface TmdbPopularResponse {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

/** Correspondance des identifiants de genres TMDB vers les catégories locales (FR). */
export const TMDB_GENRES: Record<number, { name: string; slug: string }> = {
  28: { name: "Action", slug: "action" },
  12: { name: "Aventure", slug: "aventure" },
  16: { name: "Animation", slug: "animation" },
  35: { name: "Comédie", slug: "comedie" },
  80: { name: "Crime", slug: "crime" },
  99: { name: "Documentaire", slug: "documentaire" },
  18: { name: "Drame", slug: "drame" },
  10751: { name: "Familial", slug: "familial" },
  14: { name: "Fantastique", slug: "fantastique" },
  36: { name: "Histoire", slug: "histoire" },
  27: { name: "Horreur", slug: "horreur" },
  10402: { name: "Musique", slug: "musique" },
  9648: { name: "Mystère", slug: "mystere" },
  10749: { name: "Romance", slug: "romance" },
  878: { name: "Science-Fiction", slug: "science-fiction" },
  53: { name: "Thriller", slug: "thriller" },
  10752: { name: "Guerre", slug: "guerre" },
  37: { name: "Western", slug: "western" },
};

/** Construit les en-têtes / paramètres d'authentification TMDB. */
function buildTmdbRequest(path: string, params: Record<string, string> = {}): { url: string; headers: Record<string, string> } {
  const token = process.env.TMDB_API_TOKEN; // v4 (Bearer)
  const key = process.env.TMDB_API_KEY; // v3 (api_key)

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const headers: Record<string, string> = { accept: "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (key) {
    url.searchParams.set("api_key", key);
  } else {
    throw new Error(
      "Authentification TMDB manquante : renseignez TMDB_API_TOKEN (v4) ou TMDB_API_KEY (v3) dans l'environnement."
    );
  }

  return { url: url.toString(), headers };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { url, headers } = buildTmdbRequest(path, params);
  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB a répondu ${res.status} : ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Récupère une page de films populaires. */
export function fetchPopularMovies(page = 1): Promise<TmdbPopularResponse> {
  return tmdbFetch<TmdbPopularResponse>("/movie/popular", { page: String(page) });
}

/** Récupère une page de séries populaires. */
export async function fetchPopularTv(page = 1): Promise<TmdbPopularResponse> {
  // /tv/popular a la même forme de réponse utile
  return tmdbFetch<TmdbPopularResponse>("/tv/popular", { page: String(page) });
}

/**
 * Récupère une page d'une liste TMDB quelconque (popular, top_rated,
 * now_playing, upcoming, on_the_air, trending…). Le chemin doit commencer par
 * « / » (ex. « /movie/popular »). Utilisé par la synchro du catalogue TMDB.
 */
export function fetchTmdbList(path: string, page = 1): Promise<TmdbPopularResponse> {
  return tmdbFetch<TmdbPopularResponse>(path, { page: String(page) });
}

/**
 * Récupère le synopsis FR d'un titre par son identifiant TMDB exact
 * (`/movie/{id}` ou `/tv/{id}`). Complète `fetchTmdbOverviewByTitle` quand
 * l'identifiant est déjà connu (catalogue TMDB). Retourne null en cas d'erreur.
 */
export async function fetchTmdbOverviewById(
  tmdbId: number | string,
  kind: "movie" | "tv",
): Promise<string | null> {
  if (!/^\d{1,10}$/.test(String(tmdbId))) return null;
  try {
    const data = await tmdbFetch<{ overview: string | null }>(`/${kind}/${tmdbId}`);
    return data.overview?.trim() || null;
  } catch {
    return null;
  }
}

/** Génère un slug URL propre à partir d'un titre (accents retirés). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface MediaDraft {
  title: string;
  slug: string;
  synopsis: string;
  type: "MOVIE" | "SERIES";
  accessLevel: "FREE" | "PREMIUM";
  releaseYear: number;
  durationMinutes: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  categorySlugs: string[];
}

/**
 * Convertit un film/série TMDB en ébauche de média exploitable par Prisma.
 * Gère les deux formes de champs : films (title/release_date) et séries
 * (name/first_air_date). `isPublished` reste false côté appelant.
 */
export function tmdbToMediaDraft(
  item: TmdbMovie,
  type: "MOVIE" | "SERIES" = "MOVIE"
): MediaDraft {
  const rawTitle = (type === "SERIES" ? item.name : item.title) || item.title || item.name || "";
  const rawDate = (type === "SERIES" ? item.first_air_date : item.release_date) || item.release_date || item.first_air_date || "";
  const year = rawDate ? Number(rawDate.slice(0, 4)) : new Date().getFullYear();

  const categorySlugs = (item.genre_ids || [])
    .map((id) => TMDB_GENRES[id]?.slug)
    .filter((s): s is string => Boolean(s));

  return {
    title: rawTitle,
    slug: slugify(rawTitle),
    synopsis: item.overview?.trim() || "Synopsis indisponible pour le moment.",
    type,
    accessLevel: "FREE",
    releaseYear: Number.isFinite(year) ? year : new Date().getFullYear(),
    durationMinutes: null,
    posterUrl: item.poster_path ? `${TMDB_IMG}/w500${item.poster_path}` : null,
    backdropUrl: item.backdrop_path ? `${TMDB_IMG}/original${item.backdrop_path}` : null,
    categorySlugs,
  };
}

// ─── Séries : détails, saisons et épisodes ──────────────────────────────────

/** Épisode tel que renvoyé par /tv/{id}/season/{n} (champs utiles).
 * Quand TMDB n'est pas configuré, un épisode de fallback peut ne fournir que
 * episode_number et name.
 */
export interface TmdbEpisode {
  id?: number;
  episode_number: number;
  season_number?: number;
  name: string;
  overview?: string | null;
  air_date?: string | null;
  still_path?: string | null;
  runtime?: number | null;
}

/** Saison telle que renvoyée par /tv/{id}/season/{n} (champs utiles). */
export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  poster_path: string | null;
  episodes: TmdbEpisode[];
}

/**
 * Récupère l'affiche (poster) de plusieurs saisons d'une série TMDB en parallèle.
 * Retourne un map seasonNumber → URL d'affiche complète (ou null si indisponible).
 */
export async function fetchTvSeasonsPosters(
  seriesId: number,
  seasonNumbers: number[],
): Promise<Map<number, string | null>> {
  if (!hasTmdbCredentials() || seasonNumbers.length === 0) {
    return new Map();
  }
  const results = await Promise.allSettled(
    seasonNumbers.map((n) => fetchTvSeason(seriesId, n)),
  );
  const map = new Map<number, string | null>();
  results.forEach((result, i) => {
    const seasonNumber = seasonNumbers[i];
    if (result.status === "fulfilled") {
      const s = result.value as TmdbSeason;
      map.set(
        seasonNumber,
        s.poster_path ? `${TMDB_IMG}/w300${s.poster_path}` : null,
      );
    } else {
      map.set(seasonNumber, null);
    }
  });
  return map;
}

/** Détails d'une série tels que renvoyés par /tv/{id} (champs utiles). */
export interface TmdbTvDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genre_ids: number[];
}

/** Récupère les détails d'une série (nombre de saisons, etc.). */
export function fetchTvDetails(seriesId: number): Promise<TmdbTvDetails> {
  return tmdbFetch<TmdbTvDetails>(`/tv/${seriesId}`);
}

/** Récupère une saison précise avec la liste de ses épisodes.
 * Le `language` accepte une liste TMDB : le français avec repli anglais, car
 * de nombreux épisodes n'ont pas de synopsis traduit en fr-FR.
 */
export function fetchTvSeason(seriesId: number, seasonNumber: number): Promise<TmdbSeason> {
  return tmdbFetch<TmdbSeason>(`/tv/${seriesId}/season/${seasonNumber}`, {
    language: "fr-FR,en-US",
  });
}

// ─── Enrichissement d'affiches (catalogue partenaire) ───────────────────────

/** Vrai si un identifiant TMDB (v4) ou une clé (v3) est configuré. */
export function hasTmdbCredentials(): boolean {
  return Boolean(process.env.TMDB_API_TOKEN || process.env.TMDB_API_KEY);
}

/**
 * Résout l'URL d'affiche TMDB d'un titre par son identifiant TMDB.
 * Utilisé pour compléter les affiches manquantes du catalogue partenaire
 * (les endpoints `/tv` et `/anime` de certains fournisseurs n'exposent pas de
 * poster).
 * Retourne null si absent ou en cas d'erreur — jamais d'exception remontée.
 */
export async function fetchTmdbPoster(
  tmdbId: string,
  kind: "movie" | "tv"
): Promise<string | null> {
  if (!/^\d{1,10}$/.test(tmdbId)) return null;
  try {
    const data = await tmdbFetch<{ poster_path: string | null }>(`/${kind}/${tmdbId}`);
    return data.poster_path ? `${TMDB_IMG}/w500${data.poster_path}` : null;
  } catch {
    return null;
  }
}

// ─── Recherche de synopsis par titre (catalogue partenaire) ─────────────────

/** Élément brut d'une recherche multi TMDB (champs utiles). */
interface TmdbSearchItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_count: number;
  popularity: number;
}

interface TmdbSearchResponse {
  results: TmdbSearchItem[];
}

/**
 * Nettoie un titre de fournisseur avant recherche TMDB : retire les suffixes de
 * saison / langue / qualité (« Antigang - Saison 2 », « Maid (Saison 1) »,
 * « Film - VF »…). Ne touche pas au titre sans marqueur reconnu.
 */
function stripTitleSuffix(title: string): string {
  return title
    .replace(/\s*[-–—]\s*saison\s*\d+.*$/i, "")
    .replace(/\s*\(?\bsaison\s*\d+\b\)?.*$/i, "")
    .replace(/\s*[-–—]\s*(vf|vostfr|vo|truefrench|french|multi)\b.*$/i, "")
    .replace(/\s*[-–—]\s*(hd|fhd|4k|1080p|720p)\b.*$/i, "")
    .replace(/\s*[(\[]((?:19|20)\d{2})[)\]]\s*$/i, "")
    .replace(/\s+\b(?:19|20)\d{2}\s*$/i, "")
    .trim();
}

/**
 * Année extraite d'un titre de fournisseur : priorité à l'année entre
 * parenthèses (« Siren (2018) »), sinon une année finale détachée
 * (« Siren 2018 »). Sert à désambiguïser la recherche TMDB.
 */
function yearFromTitle(title: string): number | null {
  const parenthesized = title.match(/[(\[]((?:19|20)\d{2})[)\]]/);
  if (parenthesized) return Number.parseInt(parenthesized[1], 10);
  const trailing = title.match(/\b((?:19|20)\d{2})\s*$/);
  return trailing ? Number.parseInt(trailing[1], 10) : null;
}

/** Correspondance TMDB (identifiant + type) résolue par titre. */
export interface TmdbMatch {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
}

function matchYear(item: TmdbSearchItem): number | null {
  const raw = item.release_date || item.first_air_date || "";
  return raw ? Number.parseInt(raw.slice(0, 4), 10) || null : null;
}

/**
 * Résout l'identifiant TMDB d'un titre du catalogue externe (films, séries,
 * animés). La recherche `/search/multi` est filtrée sur le type attendu et,
 * quand une année est connue (catalogue ou titre), le résultat correspondant à
 * cette année est préféré.
 *
 * Retourne null si TMDB n'est pas configuré, si rien ne correspond ou en cas
 * d'erreur — jamais d'exception remontée (CDC §11).
 */
export async function resolveTmdbMatch(
  title: string,
  kind: "movie" | "tv",
  year?: number | null,
): Promise<TmdbMatch | null> {
  if (!hasTmdbCredentials()) return null;
  const cleaned = stripTitleSuffix(title);
  if (cleaned.length < 2) return null;

  const hintedYear = year ?? yearFromTitle(title);
  try {
    const data = await tmdbFetch<TmdbSearchResponse>("/search/multi", {
      query: cleaned,
      include_adult: "false",
    });
    const candidates = (data.results ?? []).filter((r) => r.media_type === kind);
    if (candidates.length === 0) return null;

    const preferred =
      (hintedYear ? candidates.find((c) => matchYear(c) === hintedYear) : undefined) ??
      candidates[0];

    return {
      id: preferred.id,
      mediaType: kind,
      title: (preferred.title ?? preferred.name ?? cleaned).trim(),
      year: matchYear(preferred),
    };
  } catch {
    return null;
  }
}

/**
 * Résout le synopsis FR d'un titre par son nom via la recherche TMDB
 * (`/search/multi`). Utilisé pour enrichir les fiches du catalogue partenaire,
 * dont le modèle `ProviderAsset` ne stocke pas de synopsis.
 *
 * Retourne null si TMDB n'est pas configuré, si aucun film/série avec synopsis
 * ne correspond, ou en cas d'erreur — jamais d'exception remontée (CDC §11 : le
 * service reste utilisable même si un fournisseur de métadonnées tombe).
 */
export async function fetchTmdbOverviewByTitle(title: string): Promise<string | null> {
  if (!hasTmdbCredentials()) return null;
  const cleaned = stripTitleSuffix(title);
  if (cleaned.length < 2) return null;
  try {
    const data = await tmdbFetch<TmdbSearchResponse>("/search/multi", {
      query: cleaned,
      include_adult: "false",
    });
    // Meilleur résultat : film ou série disposant d'un synopsis non vide. TMDB
    // trie déjà par popularité pertinente, on prend le premier éligible.
    const best = (data.results ?? []).find(
      (r) => (r.media_type === "movie" || r.media_type === "tv") && r.overview?.trim(),
    );
    return best ? best.overview.trim() : null;
  } catch {
    return null;
  }
}

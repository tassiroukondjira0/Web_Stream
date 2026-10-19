/**
 * Client du fournisseur French-Manga (scraping DLE best-effort).
 *
 * Le site est un CMS DataLife Engine dont l'accès bot est capricieux : les
 * domaines miroirs (`french-manga.net`, `w16.french-manga.net`) sont essayés
 * dans l'ordre et le premier qui répond est conservé. Toutes les erreurs sont
 * absorbées (retour vide) : la synchro ne doit jamais casser le site
 * (§11 : le service reste utilisable si un fournisseur tombe).
 */

import type { FrenchMangaDetail, FrenchMangaItem, FrenchMangaStream } from "./frenchmanga.types";

export const FRENCHMANGA_PROVIDER = "FRENCHMANGA";

/** Candidats de domaine, du plus canonique au miroir (surcharge : `MANGA_DOMAINS`). */
const MANGA_DOMAINS = process.env.MANGA_DOMAINS
  ?.split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .map((d) => (d.startsWith("http") ? d : `https://${d}`));
const DOMAINS = (MANGA_DOMAINS?.length
  ? MANGA_DOMAINS
  : ["https://french-manga.net", "https://w16.french-manga.net"]) as readonly string[];
/** Catégorie DLE de la liste mangas (« Les Meilleurs Mangas… »). */
const CATEGORY = "manga-streaming-1";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 8000;

let cachedBase: string | null = null;

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "User-Agent": USER_AGENT, Accept: "*/*", ...extra };
}

/** Domaine opérationnel (résolu une fois, avec repli sur le miroir). */
async function getBaseUrl(): Promise<string> {
  if (cachedBase) return cachedBase;
  for (const domain of DOMAINS) {
    try {
      const res = await fetch(`${domain}/index.php?cstart=1&do=cat&category=${CATEGORY}`, {
        headers: headers(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        cachedBase = domain;
        return cachedBase;
      }
    } catch {
      // Domaine injoignable : on tente le suivant.
    }
  }
  cachedBase = DOMAINS[0];
  return cachedBase;
}

/** GET texte avec tentatives (le site répond par intermittence). */
async function fetchText(url: string, extra?: Record<string, string>): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: headers(extra),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return await res.text();
    } catch {
      // Nouvelle tentative.
    }
  }
  return null;
}

/**
 * Parse une page de catégorie en vignettes. Chaque vignette `.short` porte :
 * l'identifiant (`?newsid=ID`), le titre (`div.short-title`), l'affiche
 * (`img[src]`, hébergée TMDB), la version (`span.film-version`) et le nombre
 * d'épisodes (`span.mli-eps > « 1 / 13 » »).
 */
export function parseCatalog(html: string): FrenchMangaItem[] {
  const items: FrenchMangaItem[] = [];
  const blocks = html.split('<div class="short">').slice(1);
  for (const block of blocks) {
    const idMatch = block.match(/index\.php\?newsid=(\d+)/);
    if (!idMatch) continue;

    const titleMatch =
      block.match(/<div class="short-title">([^<]+)<\/div>/) ??
      block.match(/class="short-poster[^"]*"[^>]*\salt="([^"]*)"/);
    const title = decodeHtml(titleMatch?.[1] ?? "").trim();
    if (!title) continue;

    const posterMatch = block.match(/<img\s+src="(https:\/\/image\.tmdb\.org[^"]+)"/);
    const versionMatch = block.match(/<span class="film-version">\s*<a[^>]*>([^<]+)<\/a>/);
    const epsMatch = block.match(/<span class="mli-eps">\s*\d+\s*\/\s*(\d+)\s*</);

    items.push({
      externalId: idMatch[1],
      title,
      posterUrl: posterMatch ? posterMatch[1] : null,
      version: versionMatch ? versionMatch[1].trim() : null,
      totalEpisodes: epsMatch ? Number.parseInt(epsMatch[1], 10) : null,
    });
  }
  return items;
}

/** Rapporte une page de catalogue (cstart 1-based). Retourne [] en cas d'échec. */
export async function fetchMangaCatalogPage(page: number): Promise<FrenchMangaItem[]> {
  const cstart = Math.max(1, Math.floor(page));
  const base = await getBaseUrl();
  const html = await fetchText(`${base}/index.php?cstart=${cstart}&do=cat&category=${CATEGORY}`);
  return html ? parseCatalog(html) : [];
}

/** Détail (langues × épisodes × hôtes) via l'API JSON du site. */
export async function fetchMangaDetail(externalId: string): Promise<FrenchMangaDetail | null> {
  if (!/^\d{1,10}$/.test(externalId)) return null;
  const base = await getBaseUrl();
  const text = await fetchText(`${base}/engine/ajax/manga_episodes_api.php?id=${externalId}`, {
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${base}/index.php?newsid=${externalId}`,
  });
  if (!text) return null;
  try {
    return mapDetail(externalId, JSON.parse(text));
  } catch {
    return null;
  }
}

export interface FrenchMangaFicheMeta {
  synopsis: string | null;
  /** Année de sortie annoncée par la fiche (`span.release`). */
  releaseYear: number | null;
}

/**
 * Métadonnées d'une fiche animé, lues en une seule requête : synopsis
 * (`div.fdesc`) et année (`span.release`). La synopsis sert de repli local quand
 * TMDB n'est pas configuré ; l'année complète le catalogue, qui ne la stocke pas.
 * Toute erreur est absorbée (valeurs nulles), jamais d'exception remontée.
 */
export async function fetchMangaMeta(externalId: string): Promise<FrenchMangaFicheMeta> {
  const empty: FrenchMangaFicheMeta = { synopsis: null, releaseYear: null };
  if (!/^\d{1,10}$/.test(externalId)) return empty;
  const base = await getBaseUrl();
  const html = await fetchText(`${base}/index.php?newsid=${externalId}`);
  if (!html) return empty;

  let synopsis: string | null = null;
  const m = html.match(/<div\s+class="fdesc"[^>]*>([\s\S]*?)<\/div>/i);
  if (m) {
    const text = decodeHtml(m[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    synopsis = text.length >= 20 ? text : null;
  }

  const yearRaw = html.match(/<span\s+class="release"[^>]*>(\d{4})</i)?.[1] ?? null;
  const releaseYear = yearRaw ? Number.parseInt(yearRaw, 10) : null;

  return { synopsis, releaseYear };
}

/** Normalise la réponse `{ "<lang>": { "<ep>": { "<host>": "<url>" } }, "alt_titles": {...} }`. */
function mapDetail(externalId: string, data: unknown): FrenchMangaDetail {
  const streams: FrenchMangaStream[] = [];
  let altTitles: Record<string, string> = {};

  if (data && typeof data === "object") {
    for (const [lang, value] of Object.entries(data as Record<string, unknown>)) {
      if (lang === "alt_titles") {
        if (value && typeof value === "object") {
          altTitles = Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k, v as string]),
          );
        }
        continue;
      }
      if (!value || typeof value !== "object") continue;
      for (const [episode, hosts] of Object.entries(value as Record<string, unknown>)) {
        if (!hosts || typeof hosts !== "object") continue;
        const episodeNumber = Number.parseInt(episode, 10) || 0;
        for (const [host, url] of Object.entries(hosts as Record<string, unknown>)) {
          if (typeof url !== "string" || !/^https?:\/\//.test(url)) continue;
          streams.push({ lang: lang.toLowerCase(), episode: episodeNumber, host, url });
        }
      }
    }
  }

  return { externalId, title: altTitles.fr ?? altTitles.en ?? externalId, altTitles, streams };
}

/** Décode les entités HTML les plus courantes des titres (é, &amp;, &#039;…). */
function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

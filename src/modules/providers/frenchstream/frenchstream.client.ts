/**
 * Client du fournisseur FrenchStream (scraping DLE best-effort).
 *
 * Le site sert une page anti-bot aux clients non-navigateur : on envoie un
 * User-Agent Chrome et on essaie les domaines miroirs dans l'ordre. Toutes les
 * erreurs sont absorbées (retour vide) : la synchro ne doit jamais casser le
 * site (§11).
 */

import type {
  FrenchStreamDetail,
  FrenchStreamEpisodeInfo,
  FrenchStreamItem,
  FrenchStreamStream,
} from "./frenchstream.types";

export const FRENCHSTREAM_PROVIDER = "FRENCHSTREAM";

const DOMAINS = ["https://french-stream.net", "https://french-stream.lat"] as const;

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
      const res = await fetch(`${domain}/films/`, {
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

/**
 * GET texte avec tentatives : le site répond par intermittence (timeout,
 * 503). On réessaie jusqu'à 3 fois avant d'abandonner (retour null).
 */
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
 * Parse une page de catégorie (films ou séries) en vignettes `.short` :
 * identifiant (`?newsid=ID`), titre (`div.short-title`), affiche TMDB,
 * version (`span.film-version`) et éventuel nombre d'épisodes.
 */
export function parseCatalog(html: string): FrenchStreamItem[] {
  const items: FrenchStreamItem[] = [];
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

/** Rapporte une page de catalogue (`/films/page/N/` ou `/series/page/N/`). */
export async function fetchCatalogPage(
  kind: "films" | "series",
  page: number,
): Promise<FrenchStreamItem[]> {
  const safePage = Math.max(1, Math.floor(page));
  const suffix = safePage === 1 ? "/" : `/page/${safePage}/`;
  const base = await getBaseUrl();
  const html = await fetchText(`${base}/${kind}${suffix}`);
  return html ? parseCatalog(html) : [];
}

/**
 * Embed servi par l'API AJAX de la fiche (`/engine/ajax/film_api.php?id=`).
 * Les fiches récentes n'exposent plus `data-url` : le lecteur est injecté côté
 * client depuis cette réponse (`players.<hébergeur>.<version>`). Priorité
 * VF/FRENCH, puis VOSTFR, puis tout autre flux disponible.
 * Retourne null en cas d'échec — jamais d'exception remontée.
 */
export async function fetchApiEmbed(externalId: string): Promise<string | null> {
  if (!/^\d{1,10}$/.test(externalId)) return null;
  const base = await getBaseUrl();
  const text = await fetchText(`${base}/engine/ajax/film_api.php?id=${externalId}`, {
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${base}/index.php?newsid=${externalId}`,
  });
  if (!text) return null;
  try {
    const data = JSON.parse(text) as { players?: Record<string, Record<string, string>> };
    const byHost = Object.values(data.players ?? {});
    // 1) Versions préférées, tous hébergeurs confondus.
    for (const key of ["default", "vf", "vff", "vfq", "french", "vostfr", "vo"]) {
      for (const host of byHost) {
        const url = host?.[key];
        if (typeof url === "string" && /^https?:\/\//.test(url)) return url;
      }
    }
    // 2) N'importe quelle autre URL d'embed disponible.
    for (const host of byHost) {
      for (const url of Object.values(host ?? {})) {
        if (typeof url === "string" && /^https?:\/\//.test(url)) return url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Embed d'un film : `data-url` de la fiche historique, sinon (fiches récentes
 * au lecteur chargé en AJAX) l'API `/engine/ajax/film_api.php`.
 */
export async function fetchMovieEmbed(externalId: string): Promise<string | null> {
  if (!/^\d{1,10}$/.test(externalId)) return null;
  const base = await getBaseUrl();
  const html = await fetchText(`${base}/index.php?newsid=${externalId}`);
  if (html) {
    const m =
      html.match(/data-url="(https?:\/\/[^"]+)"/) ??
      html.match(/<iframe[^>]+id="main-player"[^>]+src="(https?:\/\/[^"]+)"/);
    if (m) return m[1];
  }
  return fetchApiEmbed(externalId);
}

export interface FrenchStreamFicheMeta {
  synopsis: string | null;
  /** Durée affichée par la fiche (« 1h45 », « 42 min »), préfixe « - » retiré. */
  runtime: string | null;
  /** Année de sortie annoncée par la fiche (le catalogue ne la stocke pas). */
  releaseYear: number | null;
}

/**
 * Métadonnées d'une fiche (film ou série), lues en une seule requête : synopsis
 * (`div.fdesc`), durée (`span.runtime`) et année (« date-de-sortie »). Le
 * catalogue partenaire ne stocke ni durée ni année — ces champs enrichissent la
 * fiche. Toute erreur est absorbée (valeurs nulles), jamais d'exception (§11).
 */
export async function fetchFicheMeta(externalId: string): Promise<FrenchStreamFicheMeta> {
  const empty: FrenchStreamFicheMeta = { synopsis: null, runtime: null, releaseYear: null };
  if (!/^\d{1,10}$/.test(externalId)) return empty;
  const base = await getBaseUrl();
  const html = await fetchText(`${base}/index.php?newsid=${externalId}`);
  if (!html) return empty;

  // Synopsis : bloc fdesc, sans le paragraphe boilerplate « Résumé … ».
  let synopsis: string | null = null;
  const block = html.match(/<div\s+class="fdesc[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (block) {
    const withoutBoilerplate = block[1].replace(/<p\s+class="desc-text"[^>]*>[\s\S]*?<\/p>/gi, " ");
    const text = decodeHtml(withoutBoilerplate.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .replace(/^[>"'\s]+/, "")
      .trim();
    synopsis = text.length >= 20 ? text : null;
  }

  // Durée : `<span class="runtime">- 2h15</span>` (film) ou « 42 min » (série).
  const runtimeRaw = html.match(/<span\s+class="runtime"[^>]*>([^<]*)</i)?.[1] ?? "";
  const runtime = decodeHtml(runtimeRaw).replace(/^[\s\-–—]+/, "").trim() || null;

  // Année : lien « date-de-sortie » (film) ou `span.release` (série).
  const yearRaw =
    html.match(/date-de-sortie[^"]*xf=(\d{4})/i)?.[1] ??
    html.match(/<span\s+class="release"[^>]*>\s*(\d{4})/i)?.[1] ??
    html.match(/<span\s+class="release_date"[^>]*>[\s\S]{0,80}?(\d{4})</i)?.[1] ??
    null;
  const releaseYear = yearRaw ? Number.parseInt(yearRaw, 10) : null;

  return { synopsis, runtime, releaseYear };
}

/** Détail d'une série : flux (langues × épisodes × hôtes) + infos épisodes. */
export async function fetchSeriesDetail(externalId: string): Promise<FrenchStreamDetail | null> {
  if (!/^\d{1,10}$/.test(externalId)) return null;
  const base = await getBaseUrl();
  const text = await fetchText(`${base}/ep-data.php?id=${externalId}&format=js`, {
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

/** Normalise `{ "<lang>": { "<ep>": { "<host>": "<url>" } }, "info": { "<ep>": {...} } }`. */
function mapDetail(externalId: string, data: unknown): FrenchStreamDetail {
  const streams: FrenchStreamStream[] = [];
  const info: Record<number, FrenchStreamEpisodeInfo> = {};

  if (data && typeof data === "object") {
    for (const [lang, value] of Object.entries(data as Record<string, unknown>)) {
      if (lang === "info") {
        if (value && typeof value === "object") {
          for (const [episode, meta] of Object.entries(value as Record<string, unknown>)) {
            if (!meta || typeof meta !== "object") continue;
            const m = episode as unknown as Record<string, unknown>;
            info[Number.parseInt(episode, 10) || 0] = {
              title: typeof m.title === "string" ? decodeHtml(m.title) : null,
              synopsis: typeof m.synopsis === "string" ? decodeHtml(m.synopsis) : null,
              poster: typeof m.poster === "string" ? m.poster : null,
            };
          }
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

  return { externalId, streams, info };
}

/** Décode les entités HTML les plus courantes. */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

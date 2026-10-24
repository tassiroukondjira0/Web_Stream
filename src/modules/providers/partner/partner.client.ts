/**
 * Client du fournisseur partenaire (scraping DLE best-effort).
 *
 * Le site sert une page anti-bot aux clients non-navigateur : on envoie un
 * User-Agent Chrome et on essaie les domaines miroirs dans l'ordre. Toutes les
 * erreurs sont absorbées (retour vide) : la synchro ne doit jamais casser le
 * site (§11).
 */

import type {
  PartnerDetail,
  PartnerEpisodeInfo,
  PartnerItem,
  PartnerMovieEmbed,
  PartnerStream,
} from "./partner.types";

export const PARTNER_PROVIDER = "FRENCHSTREAM";

/**
 * Domaines du fournisseur (essai dans l'ordre), définis via `PARTNER_DOMAINS`
 * (séparés par des virgules) : quand le fournisseur fait tourner ses
 * domaines, on met à jour la variable sans redéployer de code. Sans cette
 * variable, le fournisseur est inactif (toutes les fonctions retournent
 * vide) et seuls nos lecteurs hébergés (Vidzy TMDB) sont proposés.
 */
const PARTNER_DOMAINS = process.env.PARTNER_DOMAINS
  ?.split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .map((d) => (d.startsWith("http") ? d : `https://${d}`));

const DOMAINS: readonly string[] = PARTNER_DOMAINS?.length ? PARTNER_DOMAINS : [];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 8000;

let cachedBase: string | null = null;

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "User-Agent": USER_AGENT, Accept: "*/*", ...extra };
}

/** Domaine opérationnel (résolu une fois, avec repli sur le miroir). */
async function getBaseUrl(): Promise<string> {
  if (!DOMAINS.length) return "";
  if (cachedBase) return cachedBase;
  for (const domain of DOMAINS) {
    try {
      const res = await fetch(`${domain}/films/`, {
        headers: headers(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        // Une page réelle exposes les vignettes DLE ; un miroir mort ou un
        // défi anti-bot peut répondre 200 avec un corps vide — on passe alors
        // au domaine suivant au lieu de le mettre en cache.
        const body = await res.text();
        if (body.length > 1000) {
          cachedBase = domain;
          return cachedBase;
        }
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
 * POST de formulaire avec tentatives (le site limite par intermittence :
 * timeout, 503). Renvoie le corps texte ou null après 3 essais.
 */
async function postForm(
  url: string,
  form: Record<string, string>,
  extra?: Record<string, string>,
): Promise<string | null> {
  const body = new URLSearchParams(form).toString();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: headers({
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          Origin: new URL(url).origin,
          "Content-Length": String(Buffer.byteLength(body)),
          ...extra,
        }),
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return await res.text();
      // 429 : quota de scans du site atteint. Réessayer n'aide pas — on
      // abandonne sans bruit (le lecteur retombera sur les autres sources).
      if (res.status === 429) return null;
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
export function parseCatalog(html: string): PartnerItem[] {
  const items: PartnerItem[] = [];
  const blocks = html.split('<div class="short">').slice(1);
  for (const block of blocks) {
    const idMatch = block.match(/index\.php\?newsid=(\d+)/);
    if (!idMatch) continue;

    const titleMatch =
      block.match(/<div class="short-title">([^<]+)<\/div>/) ??
      block.match(/class="short-poster[^\"]*"[^>]*\salt="([^"]*)"/);
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

/**
 * Récupère une page de catégorie du fournisseur partenaire.
 * kind = "films" ou "series".
 */
export async function fetchPartnerCatalogPage(
  kind: "films" | "series",
  page: number,
): Promise<PartnerItem[]> {
  const base = await getBaseUrl();
  if (!base) return [];
  const html = await fetchText(`${base}/${kind}/page/${page}/`);
  if (!html) return [];
  return parseCatalog(html);
}

/**
 * Catégorie « Animation » des séries du partenaire (animes et séries animées).
 * Le partenaire ne distingue pas les animés des séries dans sa catégorie
 * principale : cette liste sert à les reclasser en `ANIME` pour la section
 * « Animes » (voir partner.sync).
 */
const ANIMATION_SERIES_PATH = "/animation-serie-//";

/** Récupère une page de la catégorie « Animation » (séries animées / animes). */
export async function fetchAnimationSeriesPage(page: number): Promise<PartnerItem[]> {
  const base = await getBaseUrl();
  if (!base) return [];
  const html = await fetchText(`${base}${ANIMATION_SERIES_PATH}page/${page}/`);
  if (!html) return [];
  return parseCatalog(html);
}

/**
 * Extrait métadonnées (synopsis, runtime, année) d'une fiche titre.
 */
export async function fetchFicheMeta(externalId: string): Promise<{
  synopsis: string | null;
  runtime: string | null;
  releaseYear: number | null;
}> {
  if (!/^\d{1,10}$/.test(externalId)) {
    return { synopsis: null, runtime: null, releaseYear: null };
  }
  const base = await getBaseUrl();
  if (!base) return { synopsis: null, runtime: null, releaseYear: null };
  const html = await fetchText(`${base}/index.php?newsid=${externalId}`);
  if (!html) return { synopsis: null, runtime: null, releaseYear: null };

  let synopsis: string | null = null;
  // Synopsis : bloc « full-story » ou « fdesc ».
  const block = html.match(/<div\s+class="(?:full-story|fdesc)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
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
export async function fetchSeriesDetail(externalId: string): Promise<PartnerDetail | null> {
  if (!/^\d{1,10}$/.test(externalId)) return null;
  const base = await getBaseUrl();
  if (!base) return null;

  // 1. Endpoint serveur auto_repair.php : flux réels du lecteur dynamique
  //    (couvre les fiches dont ep-data.php est vide).
  const repair = await fetchAutoRepairDetail(externalId);
  if (repair) return repair;

  // 2. API ep-data.php (flux structurés langue × épisode × hôte)
  const text = await fetchText(`${base}/ep-data.php?id=${externalId}&format=js`, {
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${base}/index.php?newsid=${externalId}`,
  });
  if (text) {
    try {
      const detail = mapDetail(externalId, JSON.parse(text));
      if (detail.streams.length > 0) return detail;
    } catch {
      // JSON invalide : on passe au fallback iframe ci-dessous.
    }
  }

  // 3. Fallback : extraire directement les iframes de lecteurs vidéo
  //    depuis la page de détail (ep-data.php est vide sur le site actuel).
  const html = await fetchText(`${base}/index.php?newsid=${externalId}`);
  if (!html) return null;
  const iframes = parseVideoIframes(html);
  if (iframes.length === 0) return null;

  const streams: PartnerStream[] = iframes.map((iframe) => ({
    lang: "vf",
    episode: 1,
    host: iframe.host,
    url: iframe.url,
  }));

  return { externalId, streams, info: {} };
}

/** Extrait les iframes de lecteurs vidéo (Vidzy, Voe, Uqload…) depuis une page HTML. */
export function parseVideoIframes(html: string): { host: string; url: string }[] {
  const iframes: { host: string; url: string }[] = [];
  const seen = new Set<string>();
  const pattern = /<iframe[^>]+src\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const url = decodeHtml(match[2]).trim();
    try {
      const parsed = new URL(url);
      if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || seen.has(url)) continue;
      const videoHosts = [
        "vidzy",
        "voe",
        "uqload",
        "luluvido",
        "netu",
        "kokoflix",
        "vidara",
        "stream",
        "embed",
        "player",
      ];
      if (!videoHosts.some((h) => parsed.hostname.includes(h))) continue;
      seen.add(url);
      iframes.push({ host: parsed.hostname, url });
    } catch {}
  }
  return iframes;
}

/** Parse tous les embeds HTTP(S) explicitement exposés dans les attributs data-url. */
export function parseMovieEmbeds(html: string): PartnerMovieEmbed[] {
  const embeds: PartnerMovieEmbed[] = [];
  const seen = new Set<string>();
  const attributePattern = /\bdata-url\s*=\s*(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(html)) !== null) {
    const url = decodeHtml(match[2]).trim();
    try {
      const parsed = new URL(url);
      if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || seen.has(url)) continue;
      seen.add(url);
      embeds.push({ host: parsed.hostname, url });
    } catch {
      continue;
    }
  }

  return embeds;
}

/**
 * Récupère les embeds de film : d'abord le HTML (`data-url` explicites),
 * puis l'endpoint serveur `auto_repair.php` qui expose les flux du lecteur
 * dynamique (les fiches récentes n'embarquent plus d'embed statique).
 */
export async function fetchMovieEmbeds(externalId: string): Promise<PartnerMovieEmbed[]> {
  if (!/^\d{1,10}$/.test(externalId)) return [];
  const base = await getBaseUrl();
  if (!base) return [];

  const html = await fetchText(`${base}/index.php?newsid=${externalId}`);
  const staticEmbeds = html ? parseMovieEmbeds(html) : [];
  const seen = new Set(staticEmbeds.map((e) => e.url));

  const repair = await fetchAutoRepairDetail(externalId);
  const repaired: PartnerMovieEmbed[] = [];
  if (repair) {
    for (const stream of repair.streams) {
      if (seen.has(stream.url)) continue;
      seen.add(stream.url);
      try {
        repaired.push({ host: new URL(stream.url).hostname, url: stream.url });
      } catch {
        // URL invalide : ignorée.
      }
    }
  }

  return [...staticEmbeds, ...repaired];
}

/**
 * Endpoint serveur du partenaire qui renvoie les flux réels d'une fiche
 * (`auto_repair.php`, `mode=scan`) : c'est lui qui alimente le lecteur chargé
 * côté navigateur — les embeds n'apparaissent pas dans le HTML statique.
 *
 * Réponse : `{ success, is_serie, results: [{ version, lang, ep?, vidzy_url,
 * fsvid_url, uqload_url, ... }] }`. Les hôtes valides portent `*_url` non vide
 * (les morts valent "missing"/"hs").
 */
export async function fetchAutoRepairDetail(externalId: string): Promise<PartnerDetail | null> {
  if (!/^\d{1,10}$/.test(externalId)) return null;
  const base = await getBaseUrl();
  if (!base) return null;

  const text = await postForm(
    `${base}/engine/ajax/auto_repair.php`,
    { film_id: externalId, mode: "scan" },
    { Referer: `${base}/index.php?newsid=${externalId}` },
  );
  if (!text) return null;

  try {
    const detail = mapAutoRepair(externalId, JSON.parse(text));
    return detail.streams.length > 0 ? detail : null;
  } catch {
    return null;
  }
}

/** Convertit la réponse `auto_repair.php` en détail (flux + infos épisodes). */
export function mapAutoRepair(externalId: string, data: unknown): PartnerDetail {
  const streams: PartnerStream[] = [];
  const info: Record<number, PartnerEpisodeInfo> = {};
  const results =
    data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)
      ? ((data as { results: unknown[] }).results as unknown[])
      : [];

  for (const entry of results) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const lang = (typeof r.lang === "string" ? r.lang : "vf").toLowerCase();
    const episode = typeof r.ep === "number" ? r.ep : 1;

    // Le partenaire renvoie un champ `<host>_url` par hébergeur disponible
  // (vidzy_url, fsvid_url, uqload_url, voe_url, netu_url, luluvido_url…).
  // On extrait dynamiquement tous ces champs au lieu d'une liste figée, pour
  // que tout nouveau lecteur bénéficie du même traitement que Premium/uqload.
  for (const [key, value] of Object.entries(r)) {
    if (!key.endsWith("_url")) continue;
    if (typeof value !== "string" || !/^https?:\/\//.test(value)) continue;
    const host = key.slice(0, -4); // retire le suffixe "_url"
    // `fsvid_url` est le flux « Premium » du fournisseur.
    const normalizedHost = host === "fsvid" ? "premium" : host;
    streams.push({ lang, episode, host: normalizedHost, url: value });
  }
  }

  return { externalId, streams, info };
}

/** Normalise `{ "<lang>": { "<ep>": { "<host>": "<url>" } }, "info": { "<ep>": {...} } }`. */
function mapDetail(externalId: string, data: unknown): PartnerDetail {
  const streams: PartnerStream[] = [];
  const info: Record<number, PartnerEpisodeInfo> = {};

  if (data && typeof data === "object") {
    for (const [lang, value] of Object.entries(data as Record<string, unknown>)) {
      if (lang === "info") {
        if (value && typeof value === "object") {
          for (const [episode, meta] of Object.entries(value as Record<string, unknown>)) {
            if (!meta || typeof meta !== "object") continue;
            const m = meta as Record<string, unknown>;
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

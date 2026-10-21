/**
 * Client du fournisseur `french-streaming.tv` (scraping HTML simple, sans
 * anti-bot). Moteur distinct du partenaire : catalogue en blocs `class="short"`,
 * fiches films `/film/<id>-<slug>.html` (options langue × hôte) et fiches
 * séries `/serie/<id>-<slug>.html` (un bloc `id="episodeN"` par épisode).
 *
 * Toutes les erreurs sont absorbées (retour vide) : la synchro ne doit jamais
 * casser le site (§11).
 */

import type {
  PartnerDetail,
  PartnerEpisodeInfo,
  PartnerItem,
  PartnerMovieEmbed,
  PartnerStream,
} from "../partner/partner.types";

export const FSTREAMTV_PROVIDER = "FSTREAMTV";

/**
 * Domaine du fournisseur, surchargeable via `FSTREAMTV_DOMAIN` (quand le site
 * tourne de domaine). Sans variable, le domaine par défaut est utilisé.
 */
const DOMAIN = (() => {
  const raw = process.env.FSTREAMTV_DOMAIN?.trim();
  if (!raw) return "https://www.french-streaming.tv";
  const base = raw.startsWith("http") ? raw : `https://${raw}`;
  return base.endsWith("/") ? base.slice(0, -1) : base;
})();

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 8000;

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "User-Agent": USER_AGENT, Accept: "*/*", ...extra };
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

/** Décode les entités HTML les plus courantes. */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

/**
 * Absolutise une URL d'affiche : le site source stocke parfois des chemins
 * relatifs (`/poster/x.jpg`, `/static/poster/x.jpg`) qui n'existent pas chez
 * nous et donneraient une image cassée. On les résout contre le domaine source.
 * Les valeurs manifestement invalides (pixels de tracking) sont écartées.
 */
function absolutePoster(raw: string | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) {
    // Pixel de tracking ou proto-relatif : rejeter les trackers, garder le reste.
    if (/histats|statcounter|google-analytics/i.test(value)) return null;
    return `https:${value}`;
  }
  if (value.startsWith("/")) {
    // Le préfixe `/static` devant `/poster/…` est un artefact : le site source
    // sert ces affiches sous `/poster/…`.
    return `${DOMAIN}${value.replace(/^\/static(\/poster\/)/, "$1")}`;
  }
  return null;
}

/** Normalise une version fournisseur (« VF+VOSTFR », « French »…) en langue. */
export function normalizeLang(version: string | null): string {
  const v = (version ?? "").toLowerCase();
  if (v.includes("vostfr")) return "vostfr";
  if (v.includes("vf") || v.includes("french")) return "vf";
  if (v.includes("vo")) return "vo";
  return "vf";
}

/**
 * Parse une page de catégorie (`/film/` ou `/serie/`) en vignettes
 * `div.short` : identifiant + slug depuis le href, titre (`div.short-title`),
 * affiche (`img src`), version (`span.film-verz`).
 */
export function parseCatalog(html: string): PartnerItem[] {
  const items: PartnerItem[] = [];
  const seen = new Set<string>();
  const blocks = html.split('<div class="short">').slice(1);
  for (const block of blocks) {
    const hrefMatch = block.match(/href="\/(?:film|serie)\/(\d+)-([^"]+?)\.html"/);
    if (!hrefMatch) continue;
    const externalId = hrefMatch[1];
    if (seen.has(externalId)) continue;

    const titleMatch = block.match(/<div class="short-title">([^<]+)<\/div>/);
    const title = decodeHtml(titleMatch?.[1] ?? "").trim();
    if (!title) continue;
    seen.add(externalId);

    const posterMatch = block.match(/<img\s+src="([^"]+)"/);
    const versionMatch = block.match(/<span class="film-verz">\s*<a[^>]*>([^<]+)<\/a>/);
    const epsMatch = block.match(/<span class="mli-eps">\s*\d+\s*\/\s*(\d+)\s*</);

    items.push({
      externalId,
      title,
      posterUrl: absolutePoster(decodeHtml(posterMatch?.[1] ?? "")),
      version: versionMatch ? versionMatch[1].trim() : null,
      totalEpisodes: epsMatch ? Number.parseInt(epsMatch[1], 10) : null,
    });
  }
  return items;
}

/** Récupère une page de catégorie (`/film/page/N/` ou `/serie/page/N/`). */
export async function fetchCatalogPage(
  kind: "film" | "serie",
  page: number,
): Promise<PartnerItem[]> {
  const path = page > 1 ? `/${kind}/page/${page}/` : `/${kind}/`;
  const html = await fetchText(`${DOMAIN}${path}`);
  if (!html) return [];
  return parseCatalog(html);
}

/** Domaine d'un hôte d'embed (slug court) à partir de l'URL. */
function hostSlug(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0] || host;
  } catch {
    return "unknown";
  }
}

/**
 * Détail d'une série : chaque bloc `id="episodeN"` liste ses hôtes
 * (`<li><a data-href="<embed>" target="seriePlayer">host</a></li>`). La langue
 * est lue dans le libellé « … en VF / VOSTFR » de l'en-tête d'épisode.
 */
export function parseSeriesDetail(html: string): PartnerDetail {
  const streams: PartnerStream[] = [];
  const info: Record<number, PartnerEpisodeInfo> = {};
  const seen = new Set<string>();
  const blocks = html.split(/(?=<div id="episode\d+" class="fullsfeature">)/).slice(1);

  for (const block of blocks) {
    const epMatch = block.match(/<div id="episode(\d+)" class="fullsfeature">/);
    if (!epMatch) continue;
    const episode = Number.parseInt(epMatch[1], 10);
    const lang = normalizeLang(block.match(/en\s+(VF\+VOSTFR|VOSTFR|VF|VO\b)/i)?.[1] ?? "vf");

    const linkPattern = /<li>\s*<a[^>]*data-href="([^"]+)"[^>]*>\s*(?:<i[^>]*><\/i>\s*)?([^<]*?)\s*<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkPattern.exec(block)) !== null) {
      const url = decodeHtml(m[1]).trim();
      if (!/^https?:\/\//.test(url) || seen.has(url)) continue;
      seen.add(url);
      const host = (m[2] || "").trim().toLowerCase() || hostSlug(url);
      streams.push({ lang, episode, host, url });
    }
  }

  return { externalId: "", streams, info };
}

/**
 * Détail d'un film : les `.player-option` exposent un `data-url-default` par
 * hôte (Vidzy, Filmoon…) et, le cas échéant, des `.version-option`
 * (`data-version` + `data-url`) pour les langues alternatives.
 */
export function parseMovieDetail(html: string): PartnerMovieEmbed[] {
  const embeds: PartnerMovieEmbed[] = [];
  const seen = new Set<string>();

  const optionPattern = /<div[^>]*class="player-option[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="player-option|<div[^>]*class="fctrl|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = optionPattern.exec(html)) !== null) {
    // `data-url-default` vit dans la balise ouvrante du `.player-option`
    // (match complet `m[0]`) ; les `version-option` dans son contenu (`m[1]`).
    const readTag = m[0];
    const target = m[1];
    const def = readTag.match(/data-url-default="([^"]+)"/);
    if (def) pushEmbed(embeds, seen, def[1]);
    const versionPattern = /data-url="([^"]+)"/gi;
    let v: RegExpExecArray | null;
    while ((v = versionPattern.exec(target)) !== null) pushEmbed(embeds, seen, v[1]);
  }

  if (embeds.length === 0) {
    const iframePattern = /<iframe[^>]+src="([^"]+)"/gi;
    let f: RegExpExecArray | null;
    while ((f = iframePattern.exec(html)) !== null) pushEmbed(embeds, seen, f[1]);
  }

  return embeds;
}

/** Ajoute un embed si l'URL est valide et inédite. */
function pushEmbed(out: PartnerMovieEmbed[], seen: Set<string>, raw: string): void {
  const url = decodeHtml(raw).trim();
  if (!/^https?:\/\//.test(url) || seen.has(url)) return;
  seen.add(url);
  out.push({ host: hostSlug(url), url });
}

/** Fiche série complète (`/serie/<id>-<slug>.html`) : flux par épisode. */
export async function fetchSeriesDetail(externalId: string): Promise<PartnerDetail | null> {
  const html = await fetchText(`${DOMAIN}${await resolvePath("serie", externalId)}`);
  if (!html) return null;
  const detail = parseSeriesDetail(html);
  if (detail.streams.length === 0) return null;
  return { ...detail, externalId };
}

/** Embeds d'un film (`/film/<id>-<slug>.html`). */
export async function fetchMovieEmbeds(externalId: string): Promise<PartnerMovieEmbed[]> {
  const html = await fetchText(`${DOMAIN}${await resolvePath("film", externalId)}`);
  if (!html) return [];
  return parseMovieDetail(html);
}

/**
 * Résout le chemin de fiche `/<kind>/<id>-<slug>.html` (le site exige le slug).
 * Résultat mis en cache (id → chemin) : le slug est stable.
 */
const pathCache = new Map<string, string>();

async function resolvePath(kind: "film" | "serie", externalId: string): Promise<string> {
  const key = `${kind}:${externalId}`;
  const cached = pathCache.get(key);
  if (cached) return cached;

  // Le slug est indispensable à l'URL. On tente une résolution directe via la
  // page catégorie qui contient la vignette (id → href complet).
  const direct = await findSlugPage(kind, externalId);
  const path = direct ?? `/${kind}/${externalId}-x.html`;
  pathCache.set(key, path);
  return path;
}

/** Cherche la fiche `<id>-<slug>.html` en balayant les premières pages catégorie. */
async function findSlugPage(kind: "film" | "serie", externalId: string): Promise<string | null> {
  const re = new RegExp(`href="(/${kind}/${externalId}-[^"]+?\\.html)"`);
  for (let page = 1; page <= 6; page++) {
    const path = page > 1 ? `/${kind}/page/${page}/` : `/${kind}/`;
    const html = await fetchText(`${DOMAIN}${path}`);
    if (!html) continue;
    const match = html.match(re);
    if (match) return decodeHtml(match[1]);
  }
  return null;
}

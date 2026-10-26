/**
 * Embeds externes du fournisseur (uqload, voe, filemoon, fsvid…) : helpers
 * partagés entre le proxy document (`/api/embed/ext`), le proxy runtime
 * (`/api/embed/ext/proxy`) et le filtrage des sources mortes.
 *
 * Ces hébergeurs refusent le hotlink : sans `Referer` du fournisseur ils
 * répondent 403 (fsvid, voe) ou servent une page « fichier verrouillé »
 * (uqload). On les charge donc via notre proxy, qui rejoue la requête avec le
 * bon référent côté serveur.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { isPublicIp } from "@/lib/outbound-network";

export const EMBED_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Domaines d'embeds autorisés (le partenaire peut faire tourner les TLD :
 * `.lol`, `.vc`, `.sx`, `.com`, `.to`, `.me`, etc.).
 */
export const EXTERNAL_EMBED_HOST_RE =
  /(^|\.)(uqload|fsvid|filemoon|kokoflix|kakaflix|trakx|voe|netu|waaw|hqq|luluvido|luluvise|doodstream|dood|ds2play|streamtape|strtape|mixdrop|upstream|streamwish|swishsrv|vidmoly|vido|vidzy|vidara|gaqghe|multiup|flixeo|do7go|playmogo|96ar|heatherwholeinvolve|evoload|ykfrtza)(\.[a-z0-9-]+)+$/i;

export const EXT_PROXY_PREFIX = "/api/embed/ext/proxy?u=";
export const EXT_DOC_PREFIX = "/api/embed/ext?u=";
/** Route unique qui sert à la fois de bridge (h+p) et de proxy absolu (u). */
export const EXT_BRIDGE_PATH = "/api/embed/ext/proxy";

/**
 * Secret utilisé pour signer les URLs d'embeds que nous générons nous-mêmes.
 * Il permet de proxifier un hébergeur inconnu (nouveau domaine du partenaire)
 * sans ouvrir le proxy à n'importe quelle URL fournie par l'utilisateur.
 */
const EMBED_SIGNING_SECRET =
  process.env.EMBED_PROXY_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";

function signEmbedUrl(url: string): string {
  if (!EMBED_SIGNING_SECRET) return "";
  return createHmac("sha256", EMBED_SIGNING_SECRET).update(url).digest("base64url");
}

/** Vrai si les URLs d'embeds peuvent être signées (proxy des hôtes inconnus). */
export function canSignExternalEmbeds(): boolean {
  return EMBED_SIGNING_SECRET.length > 0;
}

/** Vrai si l'URL et sa signature autorisent le proxy document. */
export function isEmbedDocumentAllowed(url: string, signature?: string | null): boolean {
  if (isExternalEmbedHost(url)) return true;
  if (!signature || !EMBED_SIGNING_SECRET) return false;
  const expected = signEmbedUrl(url);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Détecte les pages d'embed manifestement mortes : fichier verrouillé/supprimé,
 * domaine parqué, ou simple redirection JS vers une page publicitaire (les
 * hébergeurs multiup/flixeo renvoient souvent 200 avec « Loading… » puis
 * `location.replace(...)` vers un domaine parqué).
 */
const DEAD_EMBED_RE =
  /file (?:was )?locked|locked by administrator|file (?:was )?(?:deleted|removed)|no longer available|has expired|expired or has been deleted|video (?:is )?(?:not available|removed|supprim)|vid[ée]o supprim|404 not found|page not found|domain (?:name )?(?:is|may be) for sale|buy this domain|this domain is parked|parklogic/i;

export function isDeadEmbedDocument(html: string): boolean {
  const text = html.slice(0, 8_000);
  if (DEAD_EMBED_RE.test(text)) return true;
  return (
    text.length < 3_000 &&
    /location\.(?:replace|assign)\s*\(\s*["']https?:/i.test(text) &&
    !/<(?:video|iframe|object|embed)[\s>]/i.test(text)
  );
}

/** Vrai pour une adresse locale/privée : jamais de fetch sortant signé. */
export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".home.arpa")) return true;
  if (isIP(h)) return !isPublicIp(h);
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if ([a, b, Number(v4[3]), Number(v4[4])].some((n) => n > 255)) return true;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  return false;
}

/** Vrai si l'URL (absolue) pointe vers un hébergeur externe reconnu. */
export function isExternalEmbedHost(url: string): boolean {
  try {
    return EXTERNAL_EMBED_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Vrai si l'URL peut être rejouée par un proxy d'hébergeur : un domaine
 * reconnu, un CDN de diffusion connu, une URL « sentinelle » construite par le
 * bootstrap (chemin brut relatif), ou un hôte mémorisé par le proxy document
 * (flux HLS externes résolus par le document d'embed).
 * Toute URL http/https externe est autorisée (le proxy n'est pas un relais
 * ouvert : il est appelé uniquement depuis nos propres documents d'embed).
 */
export function isAllowedProxyUrl(url: string, isRuntimeHost?: (h: string) => boolean): boolean {
  try {
    const u = new URL(url);
    if (
      u.protocol !== "https:" || u.username || u.password ||
      (u.port !== "" && u.port !== "443") || isPrivateHostname(u.hostname)
    ) return false;
    if (isExternalEmbedHost(url)) return true;
    if (u.hostname === "x") return true;
    return isRuntimeHost?.(u.hostname) ?? false;
  } catch {
    return false;
  }
}

/** Enveloppe une URL d'embed externe dans notre proxy document (signée). */
export function externalEmbedUrl(url: string): string {
  const signature = signEmbedUrl(url);
  return `${EXT_DOC_PREFIX}${encodeURIComponent(url)}${signature ? `&s=${signature}` : ""}`;
}

/** Vrai si l'URL est déjà une URL proxifiée par nos soins. */
export function isProxiedEmbedUrl(url: string): boolean {
  return url.startsWith(EXT_DOC_PREFIX) || url.startsWith("/api/embed?src=");
}

/**
 * URL d'origine d'un embed proxifié (document ou média), sinon `null`.
 * Les embeds Vidzy (`/api/embed?src=`) ne sont pas gérés ici.
 */
export function originalEmbedUrl(url: string): string | null {
  if (!url.startsWith(EXT_DOC_PREFIX) && !url.startsWith(EXT_PROXY_PREFIX)) return null;
  const prefix = url.startsWith(EXT_DOC_PREFIX) ? EXT_DOC_PREFIX : EXT_PROXY_PREFIX;
  const encoded = url.slice(prefix.length).split("&s=")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

/**
 * Référent envoyé aux hébergeurs. Ordre de résolution :
 *  1. le domaine du fournisseur de repli `FSTREAMTV_DOMAIN` (fournisseur actif) ;
 *  2. le premier domaine de `PARTNER_DOMAINS` (partenaire principal, si présent) ;
 *  3. le domaine historique de repli.
 */
export function partnerReferer(): string {
  const raw =
    process.env.FSTREAMTV_DOMAIN?.trim() || process.env.PARTNER_DOMAINS?.split(",")[0]?.trim();
  if (!raw) return "https://www.french-streaming.tv/";
  const base = raw.startsWith("http") ? raw : `https://${raw}`;
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * Retourne le Referer approprié pour récupérer un document d'embed.
 *
 * Certains hébergeurs (uqload) rejettent le referer du partenaire et exigent
 * leur propre origine comme Referer, sinon ils servent une page « fichier
 * verrouillé » au lieu du player. Pour tous les autres hébergeurs, on conserve
 * le referer partenaire configuré.
 */
export function embedReferer(targetUrl: string): string {
  try {
    const u = new URL(targetUrl);
    if (/uqload/i.test(u.hostname)) return `${u.protocol}//${u.host}/`;
    return partnerReferer();
  } catch {
    return partnerReferer();
  }
}

/**
 * Chemins « same-origin » de l'hébergeur qu'un remplacement en masse vers le
 * bridge est sûr de traiter : les ressources statiques et l'API de
 * l'hébergeur. Les autres chemins racine absolus sont laissés intacts (le
 * bootstrap runtime les rattrape s'ils sont réellement appelés).
 */
const EMBED_ASSET_PATH_RE = /^\/(assets|api|static|js|css|img|images|fonts|media|player|cdn)\//i;

export function isEmbedAssetPath(path: string): boolean {
  return EMBED_ASSET_PATH_RE.test(path);
}

/** Référent (répertoire du document) transmis pour les appels relatifs. */
export function documentRefererPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Hôtes externes (ex. `strm5.uqload.vc`) que les documents d'embed ont résolu
 * à l'exécution. Le proxy runtime les autorise tant qu'ils sont mémorisés,
 * afin de relayer les flux (HLS/DASH) qu'aucune allowlist statique ne couvre.
 */
const runtimeEmbedHosts = new Map<string, number>();
const RUNTIME_HOST_TTL = 10 * 60 * 1000;

export function rememberRuntimeHost(host?: string | null): void {
  if (!host) return;
  runtimeEmbedHosts.set(host, Date.now() + RUNTIME_HOST_TTL);
  if (runtimeEmbedHosts.size > 200) {
    const now = Date.now();
    for (const [h, exp] of runtimeEmbedHosts) if (exp < now) runtimeEmbedHosts.delete(h);
  }
}

export function isRuntimeHost(host?: string | null): boolean {
  const exp = host ? runtimeEmbedHosts.get(host) : undefined;
  return typeof exp === "number" && exp > Date.now();
}

export function runtimeHostList(): string[] {
  return [...runtimeEmbedHosts.keys()];
}

const PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "net.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.jp",
  "ne.jp",
  "or.jp",
  "co.nz",
  "net.nz",
  "org.nz",
  "com.br",
  "com.mx",
  "com.sg",
  "com.hk",
  "co.za",
]);

function getRegistrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "");
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const lastTwo = parts.slice(-2).join(".");
  if (PUBLIC_SUFFIXES.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return lastTwo;
}

export function isRuntimeHostAllowedForContext(
  runtimeHost?: string | null,
  contextHost?: string | null,
): boolean {
  if (!runtimeHost || !contextHost) return false;
  const rh = runtimeHost.toLowerCase().replace(/\.$/, "");
  const ch = contextHost.toLowerCase().replace(/\.$/, "");
  if (isPrivateHostname(rh) || isIP(rh)) return false;
  if (!isRuntimeHost(rh)) return false;
  if (rh === ch) return true;
  if (rh.endsWith("." + ch)) return true;
  const rhReg = getRegistrableDomain(rh);
  const chReg = getRegistrableDomain(ch);
  if (rhReg !== chReg) return false;
  if (rh.endsWith("." + rhReg) && ch.endsWith("." + chReg)) {
    return true;
  }
  return false;
}

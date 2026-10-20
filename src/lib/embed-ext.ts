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

export const EMBED_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Domaines d'embeds autorisés (le partenaire peut faire tourner les TLD :
 * `.lol`, `.vc`, `.sx`, `.com`…). Volontairement limité aux familles connues
 * pour ne pas transformer le proxy en relais ouvert.
 */
export const EXTERNAL_EMBED_HOST_RE =
  /(^|\.)(uqload\.[a-z]+|fsvid\.[a-z]+|filemoon\.[a-z]+|trakx\.[a-z]+|voe\.[a-z]+|netu\.[a-z]+|luluvido\.[a-z]+|doodstream\.[a-z]+|dood\.[a-z]+|streamtape\.[a-z]+|mixdrop\.[a-z]+|upstream\.[a-z]+)$/i;

export const EXT_PROXY_PREFIX = "/api/embed/ext/proxy?u=";
export const EXT_DOC_PREFIX = "/api/embed/ext?u=";
/** Route unique qui sert à la fois de bridge (h+p) et de proxy absolu (u). */
export const EXT_BRIDGE_PATH = "/api/embed/ext/proxy";

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
 * reconnu, ou une URL « sentinelle » construite par le bootstrap (chemin
 * brut relatif, sans domaine) que la route résout elle-même.
 */
export function isAllowedProxyUrl(url: string): boolean {
  if (isExternalEmbedHost(url)) return true;
  try {
    return new URL(url).hostname === "x";
  } catch {
    return false;
  }
}

/** Enveloppe une URL d'embed externe dans notre proxy document. */
export function externalEmbedUrl(url: string): string {
  return `${EXT_DOC_PREFIX}${encodeURIComponent(url)}`;
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
  try {
    return decodeURIComponent(url.slice(prefix.length));
  } catch {
    return null;
  }
}

/**
 * Référent envoyé aux hébergeurs : premier domaine du fournisseur
 * (`PARTNER_DOMAINS`). Repli sur le domaine historique.
 */
export function partnerReferer(): string {
  const raw = process.env.PARTNER_DOMAINS?.split(",")[0]?.trim();
  if (!raw) return "https://french-stream.net/";
  const base = raw.startsWith("http") ? raw : `https://${raw}`;
  return base.endsWith("/") ? base : `${base}/`;
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

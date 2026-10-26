/**
 * Résolution centralisée de l'URL publique du site.
 *
 * Utilisé pour `metadataBase`, les URL canoniques, OpenGraph et le sitemap.
 * Une valeur incorrecte (localhost laissé en production) casse le référencement.
 *
 * Ordre de résolution :
 *   1. NEXT_PUBLIC_APP_URL          → contrôle explicite (domaine personnalisé)
 *   2. VERCEL_PROJECT_PRODUCTION_URL → injecté par Vercel, domaine stable
 *   3. http://localhost:3000        → développement uniquement
 *
 * ⚠️ VERCEL_URL n'est volontairement PAS utilisé : c'est l'URL du déploiement
 * courant, suffixée d'un hash unique. S'en servirait à générer des URL
 * canoniques différentes pour un même contenu (duplicate content).
 */

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

/** URL publique du site, sans slash final. */
export function getAppUrl(): string {
  const explicit = firstNonEmpty(process.env.NEXT_PUBLIC_APP_URL);

  if (explicit) {
    const url = new URL(explicit);
    if (url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
      throw new Error("NEXT_PUBLIC_APP_URL doit être une URL publique HTTPS en production.");
    }
    return url.origin;
  }

  const vercelProd = firstNonEmpty(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  if (vercelProd) {
    return `https://${vercelProd}`;
  }

  const renderUrl = firstNonEmpty(process.env.RENDER_EXTERNAL_URL);
  if (renderUrl) {
    const url = new URL(renderUrl);
    if (url.protocol === "https:" && !url.username && !url.password) return url.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL (ou RENDER_EXTERNAL_URL) doit définir l'URL publique de production.");
  }

  return "http://localhost:3000";
}

/**
 * `metadataBase` exige une URL absolue valide. On renvoie `undefined` plutôt
 * que de lever, pour ne pas faire échouer le rendu sur une config incomplète.
 */
export function getMetadataBase(): URL | undefined {
  try {
    return new URL(getAppUrl());
  } catch {
    return undefined;
  }
}

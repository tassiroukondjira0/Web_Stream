/**
 * Résolution centralisée de l'URL publique du site.
 *
 * Utilisé pour `metadataBase`, les URL canoniques, OpenGraph et le sitemap.
 * Une valeur incorrecte (localhost laissé en production) casse le référencement.
 *
 * Ordre de résolution :
 *   1. NEXT_PUBLIC_APP_URL          → contrôle explicite (domaine personnalisé)
 *   2. VERCEL_PROJECT_PRODUCTION_URL → injecté par Vercel, domaine stable
 *   3. http://localhost:3000        → développement
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
    return explicit.replace(/\/+$/, "");
  }

  const vercelProd = firstNonEmpty(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  if (vercelProd) {
    return `https://${vercelProd}`;
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

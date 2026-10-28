import type { PlayerSource } from "@/lib/player-sources";
import {
  EMBED_USER_AGENT,
  embedReferer,
  isDeadEmbedDocument,
  originalEmbedUrl,
} from "@/lib/embed-ext";

/**
 * Vérification des embeds externes du fournisseur.
 *
 * Plusieurs hébergeurs du partenaire servent des fichiers morts : uqload
 * répond « File was locked by administrator », filemoon un 404, fsvid/voe un
 * 403 nginx. Autant les retirer du sélecteur plutôt que proposer une iframe
 * vide. Le test est best-effort : en cas de doute (timeout, 5xx, réseau), on
 * conserve la source — seule une preuve de décès la masque.
 */

const REQUEST_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

/** Statuts considérés comme définitifs (le fichier n'existe plus). */
const DEAD_STATUSES = new Set([403, 404, 410, 451]);

const cache = new Map<string, { alive: boolean; ts: number }>();

export async function isExternalEmbedAlive(url: string): Promise<boolean> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.alive;

  const alive = await probe(url);
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(url, { alive, ts: Date.now() });
  return alive;
}

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": EMBED_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Referer: embedReferer(url),
      },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (DEAD_STATUSES.has(res.status)) return false;
    if (!res.ok) return true;
    return !isDeadEmbedDocument(await res.text());
  } catch {
    return true;
  }
}

/**
 * Retire les sources externes mortes. Les sources Vidzy et les URLs non
 * proxifiées sont conservées telles quelles.
 */
export async function filterPlayableSources(
  sources: PlayerSource[],
): Promise<PlayerSource[]> {
  const checked = await Promise.all(
    sources.map(async (source) => {
      const original = originalEmbedUrl(source.url);
      if (!original) return source;
      return (await isExternalEmbedAlive(original)) ? source : null;
    }),
  );
  return checked.filter((source): source is PlayerSource => source !== null);
}

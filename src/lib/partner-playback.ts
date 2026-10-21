import { prisma } from "@/lib/prisma";
import { normalizeTitleKey } from "@/lib/title-key";
import { providerSources, type PlayerSource } from "@/lib/player-sources";
import { filterPlayableSources } from "@/lib/embed-health";
import {
  PARTNER_PROVIDER,
  fetchMovieEmbeds,
  fetchSeriesDetail,
} from "@/modules/providers/partner/partner.client";
import {
  FSTREAMTV_PROVIDER,
  fetchMovieEmbeds as fetchFStreamTvMovieEmbeds,
  fetchSeriesDetail as fetchFStreamTvSeriesDetail,
} from "@/modules/providers/fstreamtv/fstreamtv.client";

/**
 * Resolves provider embeds for an exact title/year match so TMDB catalogue
 * pages can offer partner alternatives (uqload, voe, netu, premium…) without
 * fuzzy title cross-linking.
 *
 * Le partenaire publie UNE fiche par saison (« Titre - Saison 3 ») dont
 * l'ep-data liste les épisodes 1..N de CETTE saison : `season` sélectionne la
 * fiche et les flux sont remappés sur le même numéro de saison pour
 * s'aligner sur la grille Vidzy.
 */
export async function resolvePartnerPlaybackSources(
  title: string,
  contentType: "MOVIE" | "SERIES" | "ANIME",
  year: number | null,
  season = 1,
): Promise<PlayerSource[]> {
  return resolveProviderSources(PARTNER_PROVIDER, "frenchstream", title, contentType, year, season, {
    fetchSeriesDetail,
    fetchMovieEmbeds,
  });
}

/**
 * Résout les flux du fournisseur de repli `french-streaming.tv` (mêmes règles
 * de correspondance que le partenaire principal). Appelé seulement quand le
 * partenaire principal n'expose aucune source lisible.
 */
export async function resolveFStreamTvPlaybackSources(
  title: string,
  contentType: "MOVIE" | "SERIES" | "ANIME",
  year: number | null,
  season = 1,
): Promise<PlayerSource[]> {
  return resolveProviderSources(
    FSTREAMTV_PROVIDER,
    "fstreamtv",
    title,
    contentType,
    year,
    season,
    { fetchSeriesDetail: fetchFStreamTvSeriesDetail, fetchMovieEmbeds: fetchFStreamTvMovieEmbeds },
  );
}

type ProviderDetail = Awaited<ReturnType<typeof fetchSeriesDetail>>;
type ProviderEmbeds = Awaited<ReturnType<typeof fetchMovieEmbeds>>;

/**
 * Cœur commun de résolution : interroge l'index d'un fournisseur, apparie le
 * titre (strict puis souple), puis récupère en direct les flux lisibles de la
 * meilleure fiche.
 */
async function resolveProviderSources(
  provider: string,
  providerKey: "frenchstream" | "fstreamtv",
  title: string,
  contentType: "MOVIE" | "SERIES" | "ANIME",
  year: number | null,
  season: number,
  fetchers: {
    fetchSeriesDetail: (externalId: string) => Promise<ProviderDetail>;
    fetchMovieEmbeds: (externalId: string) => Promise<ProviderEmbeds>;
  },
): Promise<PlayerSource[]> {
  if (process.env.DATABASE_READY !== "true") return [];

  const titleKey = normalizeTitleKey(title);
  const tokens = significantTokens(titleKey);
  if (tokens.length === 0) return [];

  // Le partenaire publie les animés dans sa catégorie « Séries » ; la synchro
  // les reclasse en `ANIME` (voir partner.sync). On interroge les deux types
  // pour rester robuste entre deux synchros.
  const assetTypes =
    contentType === "ANIME" ? (["ANIME", "SERIES"] as const) : ([contentType] as const);

  // On interroge l'index sur CHAQUE mot significatif (OR) plutôt que sur le
  // seul plus long : un mot long mais banal (« mauvaise ») ramenait surtout du
  // bruit, et un titre dont le mot distinctif diffère du plus long passait à
  // travers. Le classement fin se fait ensuite en mémoire (score de similarité).
  let candidates;
  try {
    candidates = await prisma.providerAsset.findMany({
      where: {
        provider,
        contentType: { in: [...assetTypes] },
        isPublished: true,
        OR: tokens.map((t) => ({ title: { contains: t, mode: "insensitive" } })),
      },
      select: { externalId: true, title: true, releaseYear: true },
      take: 200,
    });
  } catch (error) {
    console.error("Erreur de recherche des sources fournisseur :", error);
    return [];
  }

  const strictMatches = candidates.filter(
    (asset) =>
      normalizeTitleKey(asset.title) === titleKey &&
      (!year || asset.releaseYear === null || asset.releaseYear === year),
  );

  // Repli : le fournisseur décore parfois le titre (« The Thing 1982 », « [VF] »,
  // ponctuation, qualificatif ajouté…). On classe les candidats par similarité
  // de mots significatifs, en gardant la contrainte d'année quand elle est
  // connue : le premier de la liste est le meilleur candidat.
  const matches =
    strictMatches.length > 0
      ? strictMatches
      : candidates
          .filter((asset) => !year || asset.releaseYear === null || asset.releaseYear === year)
          .map((asset) => ({ asset, score: titleOverlap(normalizeTitleKey(asset.title), tokens) }))
          .filter(({ score }) => score >= LOOSE_MATCH_MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .map(({ asset }) => asset);
  if (matches.length === 0) return [];

  if (contentType === "MOVIE") {
    const exactYearMatches = year ? matches.filter((asset) => asset.releaseYear === year) : [];
    // Plusieurs fiches peuvent porter le même titre (remakes, éditions) : on
    // privilégie l'année exacte, sinon on tente toutes les fiches plutôt que
    // de renoncer — la première qui expose un flux lisible gagne.
    const ordered = exactYearMatches.length > 0 ? exactYearMatches : matches;
    return firstPlayableMovieSources(ordered, providerKey, fetchers.fetchMovieEmbeds);
  }

  // Série : fiche de la saison demandée, sinon fiche unique sans suffixe, sinon
  // la première fiche disponible (le fournisseur publie une fiche par saison).
  const fiche =
    matches.find((asset) => seasonFromTitle(asset.title) === season) ??
    matches.find((asset) => seasonFromTitle(asset.title) === null) ??
    matches[0];
  if (!fiche) return [];

  const detail = await fetchers.fetchSeriesDetail(fiche.externalId);
  if (!detail) return [];
  return filterPlayableSources(providerSources(detail.streams, season, providerKey));
}

/**
 * Essaie les fiches film dans l'ordre et renvoie la première qui expose au
 * moins un flux lisible (les embeds sont résolus en direct, donc une fiche
 * peut être vide alors que la suivante fonctionne).
 */
async function firstPlayableMovieSources(
  matches: { externalId: string; title: string; releaseYear: number | null }[],
  providerKey: "frenchstream" | "fstreamtv",
  fetchMovieEmbeds: (externalId: string) => Promise<ProviderEmbeds>,
): Promise<PlayerSource[]> {
  for (const asset of matches.slice(0, 5)) {
    const embeds = await fetchMovieEmbeds(asset.externalId);
    if (embeds.length === 0) continue;
    const sources = providerSources(
      embeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
      1,
      providerKey,
    );
    const playable = await filterPlayableSources(sources);
    if (playable.length > 0) return playable;
  }
  return [];
}

/** Numéro de saison déduit d'un titre partenaire (« Titre - Saison 3 »). */
function seasonFromTitle(title: string): number | null {
  const match = title.match(/\bsaison\s*(\d+)\b/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** Mots trop courants pour discriminer un titre partenaire. */
const STOPWORDS = new Set([
  "the", "les", "des", "une", "und", "der", "die", "das", "los", "las",
  "pour", "avec", "dans", "sur", "aux", "von", "van", "for", "and",
]);

/**
 * Mots significatifs d'une clé de titre : longueur ≥ 4 et hors mots vides.
 * Sert à interroger l'index partenaire et à scorer les candidats.
 */
function significantTokens(titleKey: string): string[] {
  return Array.from(
    new Set(
      titleKey
        .split(" ")
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    ),
  );
}

/** Seuil de recouvrement pour accepter un candidat « souple ». */
const LOOSE_MATCH_MIN_SCORE = 0.6;

/**
 * Score de similarité ∈ [0,1] entre la clé d'un candidat et les mots
 * significatifs du titre recherché : part des mots du titre présents dans le
 * candidat (en préfixe de mot pour absorber les variations de terminaison).
 */
function titleOverlap(candidateKey: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const candidateWords = candidateKey.split(" ");
  let hit = 0;
  for (const token of tokens) {
    if (candidateWords.some((w) => w === token || w.startsWith(token) || token.startsWith(w))) {
      hit++;
    }
  }
  return hit / tokens.length;
}

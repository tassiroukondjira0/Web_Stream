import { prisma } from "@/lib/prisma";
import { normalizeTitleKey } from "@/lib/title-key";
import { providerSources, type PlayerSource } from "@/lib/player-sources";
import { filterPlayableSources } from "@/lib/embed-health";
import {
  PARTNER_PROVIDER,
  fetchMovieEmbeds,
  fetchSeriesDetail,
} from "@/modules/providers/partner/partner.client";

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
  if (process.env.DATABASE_READY !== "true") return [];

  const titleKey = normalizeTitleKey(title);
  const queryToken = titleKey.split(" ").sort((a, b) => b.length - a.length)[0];
  if (!queryToken || queryToken.length < 3) return [];

  // Le partenaire classe les animés comme des séries (pas de type ANIME).
  const assetType = contentType === "ANIME" ? "SERIES" : contentType;

  let candidates;
  try {
    candidates = await prisma.providerAsset.findMany({
      where: {
        provider: PARTNER_PROVIDER,
        contentType: assetType,
        isPublished: true,
        title: { contains: queryToken, mode: "insensitive" },
        ...(year ? { OR: [{ releaseYear: year }, { releaseYear: null }] } : {}),
      },
      select: { externalId: true, title: true, releaseYear: true },
      take: 100,
    });
  } catch (error) {
    console.error("Erreur de recherche des sources partenaire :", error);
    return [];
  }

  const matches = candidates.filter(
    (asset) =>
      normalizeTitleKey(asset.title) === titleKey &&
      (!year || asset.releaseYear === null || asset.releaseYear === year),
  );
  if (matches.length === 0) return [];

  if (contentType === "MOVIE") {
    const exactYearMatches = year ? matches.filter((asset) => asset.releaseYear === year) : [];
    const uniqueMatches = exactYearMatches.length > 0 ? exactYearMatches : matches;
    if (uniqueMatches.length !== 1) return [];
    const embeds = await fetchMovieEmbeds(uniqueMatches[0].externalId);
    const sources = providerSources(
      embeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
      1,
      "frenchstream",
    );
    return filterPlayableSources(sources);
  }

  // Série : fiche de la saison demandée, sinon fiche unique sans suffixe.
  const fiche =
    matches.find((asset) => seasonFromTitle(asset.title) === season) ??
    matches.find((asset) => seasonFromTitle(asset.title) === null);
  if (!fiche) return [];

  const detail = await fetchSeriesDetail(fiche.externalId);
  if (!detail) return [];
  return filterPlayableSources(providerSources(detail.streams, season, "frenchstream"));
}

/** Numéro de saison déduit d'un titre partenaire (« Titre - Saison 3 »). */
function seasonFromTitle(title: string): number | null {
  const match = title.match(/\bsaison\s*(\d+)\b/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

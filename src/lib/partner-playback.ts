import { prisma } from "@/lib/prisma";
import { normalizeTitleKey } from "@/lib/title-key";
import { providerSources, type PlayerSource } from "@/lib/player-sources";
import {
  PARTNER_PROVIDER,
  fetchMovieEmbeds,
  fetchSeriesDetail,
} from "@/modules/providers/partner/partner.client";

/**
 * Resolves provider embeds for an exact title/year match so TMDB catalogue
 * pages can offer a partner alternative without fuzzy title cross-linking.
 */
export async function resolvePartnerPlaybackSources(
  title: string,
  contentType: "MOVIE" | "SERIES" | "ANIME",
  year: number | null,
): Promise<PlayerSource[]> {
  if (process.env.DATABASE_READY !== "true") return [];

  const titleKey = normalizeTitleKey(title);
  const queryToken = titleKey.split(" ").sort((a, b) => b.length - a.length)[0];
  if (!queryToken || queryToken.length < 3) return [];

  let candidates;
  try {
    candidates = await prisma.providerAsset.findMany({
      where: {
        provider: PARTNER_PROVIDER,
        contentType,
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
  const exactYearMatches = year ? matches.filter((asset) => asset.releaseYear === year) : [];
  const uniqueMatches = exactYearMatches.length > 0 ? exactYearMatches : matches;
  if (uniqueMatches.length !== 1) return [];

  const externalId = uniqueMatches[0].externalId;
  if (contentType === "MOVIE") {
    const embeds = await fetchMovieEmbeds(externalId);
    return providerSources(
      embeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
    );
  }

  const detail = await fetchSeriesDetail(externalId);
  return detail ? providerSources(detail.streams) : [];
}

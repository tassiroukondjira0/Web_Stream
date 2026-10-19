import { prisma } from "@/lib/prisma";
import { normalizeTitleKey } from "@/lib/title-key";
import { PARTNER_PROVIDER, fetchMovieEmbed, fetchSeriesDetail } from "@/modules/providers/partner/partner.client";
import { providerSources, vidzySources } from "@/lib/player-sources";
import { resolveCatalogPlayback } from "@/lib/vidzy";
import { SourcePlayer } from "@/components/SourcePlayer";

/**
 * Lecteur des fiches locales : Vidzy et, si une correspondance unique existe,
 * les embeds de la fiche partenaire correspondante.
 */
async function resolvePartnerSources(
  title: string,
  contentType: "MOVIE" | "SERIES",
  year: number | null,
) {
  if (process.env.DATABASE_READY !== "true") return [];

  const titleKey = normalizeTitleKey(title);
  const queryToken = titleKey.split(" ").find((part) => part.length >= 3);
  if (!queryToken) return [];

  try {
    const candidates = await prisma.providerAsset.findMany({
      where: {
        provider: PARTNER_PROVIDER,
        contentType,
        isPublished: true,
        title: { contains: queryToken, mode: "insensitive" },
        ...(year
          ? { OR: [{ releaseYear: year }, { releaseYear: null }] }
          : {}),
      },
      select: { externalId: true, title: true, releaseYear: true },
      take: 100,
    });

    const matches = candidates.filter(
      (asset) =>
        normalizeTitleKey(asset.title) === titleKey &&
        (!year || asset.releaseYear === null || asset.releaseYear === year),
    );
    const exactYearMatches = year
      ? matches.filter((asset) => asset.releaseYear === year)
      : [];
    const uniqueMatches = exactYearMatches.length > 0 ? exactYearMatches : matches;
    if (uniqueMatches.length !== 1) return [];

    const externalId = uniqueMatches[0].externalId;
    if (contentType === "MOVIE") {
      const embed = await fetchMovieEmbed(externalId);
      return embed
        ? providerSources([{ lang: "vf", episode: 1, host: "partner", url: embed }])
        : [];
    }

    const detail = await fetchSeriesDetail(externalId);
    return detail ? providerSources(detail.streams) : [];
  } catch (error) {
    console.error("Erreur de résolution de source partenaire :", error);
    return [];
  }
}

export async function VidzyPlayer({
  basePath,
  slug,
  title,
  contentType,
  year,
  searchParams,
}: {
  basePath: string;
  slug: string;
  title: string;
  contentType: "MOVIE" | "SERIES";
  year: number | null;
  searchParams: { lang?: string; season?: string; ep?: string; host?: string };
}) {
  const [playback, partnerSources] = await Promise.all([
    resolveCatalogPlayback(title, contentType, year),
    resolvePartnerSources(title, contentType, year),
  ]);
  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...partnerSources,
  ];

  if (sources.length === 0) return null;

  const hrefFor = ({
    lang,
    season,
    episode,
    host,
  }: {
    lang?: string | null;
    season?: number | null;
    episode?: number | null;
    host?: string | null;
  }) => {
    const query = new URLSearchParams();
    if (lang) query.set("lang", lang);
    if (season) query.set("season", String(season));
    if (episode) query.set("ep", String(episode));
    if (host) query.set("host", host);
    const qs = query.toString();
    return `${basePath}/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <SourcePlayer
      sources={sources}
      hrefFor={hrefFor}
      selection={{
        lang: searchParams.lang,
        season: Number.parseInt(searchParams.season ?? "", 10) || null,
        episode: Number.parseInt(searchParams.ep ?? "", 10) || null,
        host: searchParams.host,
      }}
      title={title}
    />
  );
}

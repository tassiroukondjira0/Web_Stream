import { vidzySources } from "@/lib/player-sources";
import { resolveCatalogPlayback } from "@/lib/vidzy";
import {
  resolveFStreamTvPlaybackSources,
  resolvePartnerPlaybackSources,
} from "@/lib/partner-playback";
import { SourcePlayer } from "@/components/SourcePlayer";

/** Lecteur des fiches locales : Vidzy (TMDB) + sources partenaires. */

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
  const playback = await resolveCatalogPlayback(title, contentType, year);

  const requestedSeason = Number.parseInt(searchParams.season ?? "", 10) || null;
  const allSeasons = playback?.seasons ?? [];
  const activeSeason =
    requestedSeason !== null && allSeasons.some((s) => s.season === requestedSeason)
      ? requestedSeason
      : (allSeasons[0]?.season ?? requestedSeason ?? 1);

  // Sources partenaire : une fiche par saison, récupérée pour la saison active.
  const partnerSources = await resolvePartnerPlaybackSources(
    title,
    contentType,
    year,
    activeSeason,
  ).catch(() => []);

  // Repli : si le partenaire principal n'expose aucune source lisible, on tente
  // le fournisseur secondaire (`french-streaming.tv`, moteur distinct).
  const fallbackSources =
    partnerSources.length > 0
      ? []
      : await resolveFStreamTvPlaybackSources(title, contentType, year, activeSeason).catch(
          () => [],
        );

  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...partnerSources,
    ...fallbackSources,
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

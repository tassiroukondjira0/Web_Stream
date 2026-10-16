import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Film, Play } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { SourcePlayer } from "@/components/SourcePlayer";
import { SeasonSelector } from "@/components/SeasonSelector";
import { prisma } from "@/lib/prisma";
import { fetchTmdbOverviewByTitle } from "@/lib/tmdb";
import { resolveCatalogPlayback } from "@/lib/vidzy";
import { providerSources, vidzySources } from "@/lib/player-sources";
import {
  fetchMangaDetail,
  fetchMangaMeta,
} from "@/modules/providers/frenchmanga/frenchmanga.client";

/**
 * Fiche & lecteur d'un manga du catalogue French-Manga.
 *
 * Le lecteur est multi-sources : le flux Vidzy (identifiant TMDB résolu depuis
 * le titre) est fusionné avec les iframes du fournisseur (vidzy.live, luluvido…)
 * récupérés via son API JSON. L'utilisateur choisit langue / saison / épisode /
 * hébergeur.
 */

interface FrenchMangaPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}

// Données vivantes (site externe) : jamais prérendu, toujours à la demande.
export const instant = false;

export async function generateMetadata({ params }: FrenchMangaPageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: "FRENCHMANGA", externalId: id, contentType: "ANIME" },
      select: { title: true },
    })
    .catch(() => null);
  const title = asset?.title ?? "Manga";
  const description = await fetchTmdbOverviewByTitle(title).catch(() => null);
  return {
    title: `${title} — CinéMax`,
    description: description?.slice(0, 160) ?? undefined,
    robots: { index: false },
  };
}

export default async function FrenchMangaPage({ params, searchParams }: FrenchMangaPageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: "FRENCHMANGA", externalId: id, contentType: "ANIME" },
      select: { title: true, posterUrl: true, totalEpisodes: true, releaseYear: true },
    })
    .catch(() => null);

  const titleBase = asset?.title ?? "Manga";

  // Synopsis + lecture Vidzy + détail fournisseur (hosts).
  const [overview, playback, detail, fiche] = await Promise.all([
    fetchTmdbOverviewByTitle(titleBase),
    resolveCatalogPlayback(titleBase, "ANIME", asset?.releaseYear ?? null),
    fetchMangaDetail(id).catch(() => null),
    fetchMangaMeta(id),
  ]);

  const fullTitle = asset?.title ?? detail?.title ?? titleBase;
  const synopsis = overview ?? fiche.synopsis;

  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...(detail ? providerSources(detail.streams, 1) : []),
  ];

  if (sources.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Film className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
        <h1 className="text-xl font-bold text-white">Contenu indisponible</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Aucun flux de lecture n&apos;est disponible pour ce titre pour le moment.
        </p>
        <Link
          href="/animes"
          className="mt-6 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Retour aux animés
        </Link>
      </div>
    );
  }

  const poster = asset?.posterUrl ?? playback?.poster ?? null;
  const year = asset?.releaseYear ?? fiche.releaseYear ?? playback?.year ?? null;
  const totalEpisodes = Math.max(
    asset?.totalEpisodes ?? 0,
    detail?.streams ? new Set(detail.streams.map((s) => s.episode)).size : 0,
    playback?.seasons.reduce((n, s) => n + s.episodes.length, 0) ?? 0,
  );

  const currentSeason = sp.season ? Number.parseInt(sp.season, 10) : null;

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
    return `/series/frenchmanga/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/animes"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Catalogue animés & mangas
      </Link>

      <SourcePlayer
        sources={sources}
        hrefFor={hrefFor}
        selection={{
          lang: sp.lang,
          season: currentSeason,
          episode: Number.parseInt(sp.ep ?? "", 10) || null,
          host: sp.host,
        }}
        title={fullTitle}
      />

      <div className="mt-8 flex gap-5">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={fullTitle}
            className="hidden h-48 w-32 shrink-0 rounded-xl object-cover sm:block"
          />
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{fullTitle}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {year && <span>{year}</span>}
            {totalEpisodes > 0 && (
              <span className={year ? "border-l border-white/10 pl-3" : ""}>
                {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {detail?.altTitles && Object.keys(detail.altTitles).length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              {Object.entries(detail.altTitles)
                .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                .join(" · ")}
            </p>
          )}
          {synopsis && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{synopsis}</p>
          )}
          <SeasonSelector seasons={playback?.seasons ?? []} currentSeason={currentSeason} />
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`frenchmanga-anime-${id}`} />
            <WishlistButton mediaSlug={`frenchmanga-anime-${id}`} />
            <ShareButton title={fullTitle} />
          </div>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Plusieurs sources sont proposées quand elles sont disponibles. La disponibilité et les
        droits de diffusion relèvent des fournisseurs.
      </p>
    </div>
  );
}

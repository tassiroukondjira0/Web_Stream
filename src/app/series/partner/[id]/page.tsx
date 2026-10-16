import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Play, Tv } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { prisma } from "@/lib/prisma";
import { fetchTmdbOverviewByTitle } from "@/lib/tmdb";
import {
  fetchFicheMeta,
  fetchMovieEmbed,
  fetchSeriesDetail,
  PARTNER_PROVIDER,
} from "@/modules/providers/partner/partner.client";

/**
 * Fiche & lecteur d'une série partenaire : langues × épisodes × hébergeurs,
 * récupérés à la demande via l'API du fournisseur. Sélection par navigation
 * serveur (?lang=vf&ep=1&host=vidzy) — aucune dépendance client.
 */

interface PartnerSeriesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; ep?: string; host?: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: PARTNER_PROVIDER, externalId: id, contentType: "SERIES" },
      select: { title: true },
    })
    .catch(() => null);
  const title = asset?.title ?? "Série";
  const description = await fetchTmdbOverviewByTitle(title).catch(() => null);
  return {
    title: `${title} — CinéMax`,
    description: description?.slice(0, 160) ?? undefined,
    robots: { index: false },
  };
}

export default async function PartnerSeriesPage({
  params,
  searchParams,
}: PartnerSeriesPageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: PARTNER_PROVIDER, externalId: id, contentType: "SERIES" },
      select: { title: true, posterUrl: true, totalEpisodes: true, releaseYear: true },
    })
    .catch(() => null);

  const [detail, overview, fiche] = await Promise.all([
    fetchSeriesDetail(id),
    fetchTmdbOverviewByTitle(asset?.title ?? ""),
    fetchFicheMeta(id),
  ]);

  const title = asset?.title ?? "Série";
  const streams = detail?.streams ?? [];

  // Repli cross-type : le catalogue « séries » liste parfois des films (aucune
  // piste épisode renvoyée par l'API épisode). On tente alors l'embed film avant
  // d'abandonner — le titre est bel et bien lisible, simplement mal classé.
  const movieEmbed = streams.length === 0 ? await fetchMovieEmbed(id) : null;

  // Métadonnées de fiche : année et durée (le catalogue ne les stocke pas).
  const year = asset?.releaseYear ?? fiche.releaseYear;
  const ficheSynopsis = fiche.synopsis;

  if (streams.length === 0 && !movieEmbed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Tv className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
        <h1 className="text-xl font-bold text-white">Série indisponible</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Aucun flux de lecture n&apos;est disponible pour cette série pour le moment.
        </p>
        <Link
          href="/series"
          className="mt-6 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Retour aux séries
        </Link>
      </div>
    );
  }

  // Langue sélectionnée (défaut : première langue disponible).
  const langs = unique(streams.map((s) => s.lang));
  const lang = langs.includes(sp.lang ?? "") ? (sp.lang as string) : langs[0];

  // Épisode sélectionné (défaut : premier épisode).
  const episodes = unique(streams.filter((s) => s.lang === lang).map((s) => s.episode)).sort(
    (a, b) => a - b,
  );
  const episode =
    episodes.includes(Number.parseInt(sp.ep ?? "", 10))
      ? Number.parseInt(sp.ep as string, 10)
      : episodes[0];

  // Hôtes pour cet épisode / cette langue.
  const hosts = streams.filter((s) => s.lang === lang && s.episode === episode);
  const selected = hosts.find((s) => s.host === sp.host) ?? hosts[0];
  const info = detail?.info[episode] ?? null;

  const isActive = selected?.host === sp.host || (!sp.host && hosts[0]?.host === selected?.host);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/series"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Catalogue séries
      </Link>

      {/* Sélecteur de langue */}
      {langs.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {langs.map((l) => (
            <Link
              key={l}
              href={`/series/partner/${id}?lang=${encodeURIComponent(l)}&ep=${episode}&host=${encodeURIComponent(selected?.host ?? "")}`}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                l === lang ? "border-zinc-400 bg-zinc-700 text-white" : "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
      )}

      {/* Liste des épisodes */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">Épisodes</h2>
        <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {episodes.map((ep) => {
            const epHosts = streams.filter((s) => s.lang === lang && s.episode === ep);
            const epSelected = epHosts.find((s) => s.host === selected?.host) ?? epHosts[0];
            const epInfo = detail?.info[ep] ?? null;
            const isCurrent = ep === episode;
            return (
              <Link
                key={ep}
                href={`/series/partner/${id}?lang=${encodeURIComponent(lang)}&ep=${ep}&host=${encodeURIComponent(epSelected?.host ?? "")}`}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  isCurrent
                    ? "border-zinc-400 bg-zinc-700 text-white"
                    : "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center">
                  {isCurrent ? (
                    <span className="text-[10px] font-bold">Lecture</span>
                  ) : (
                    <Play className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
                <span className="text-[11px]">{ep}</span>
                {epInfo?.title && (
                  <span className="mt-0.5 block truncate text-xs text-zinc-400">{epInfo.title}</span>
                )}
              </Link>
            );
          })}
        </ol>
      </section>

      {hosts.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hosts.map((h) => (
            <Link
              key={h.host}
              href={`/series/partner/${id}?lang=${encodeURIComponent(lang)}&ep=${episode}&host=${encodeURIComponent(h.host)}`}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                selected && h.host === selected.host
                  ? "border-zinc-400 bg-zinc-700 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {h.host}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-5">
        {(info?.poster ?? asset?.posterUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(info?.poster ?? asset?.posterUrl) as string}
            alt={title}
            className="hidden h-48 w-32 shrink-0 rounded-xl object-cover sm:block"
          />
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {year && <span>{year}</span>}
            {totalEpisodes > 0 && (
              <span className={year ? "border-l border-white/10 pl-3" : ""}>
                {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
              </span>
            )}
            <span className={year || totalEpisodes > 0 ? "border-l border-white/10 pl-3" : ""}>
              {lang.toUpperCase()} · Épisode {episode}
            </span>
          </div>
          {info?.title && <h2 className="mt-3 text-sm font-semibold text-zinc-200">{info.title}</h2>}
          {/* Synopsis de l'épisode > TMDB > fiche du fournisseur. */}
          {(info?.synopsis ?? ficheSynopsis ?? overview) && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
              {info?.synopsis ?? ficheSynopsis ?? overview}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`partner-series-${id}`} />
            <WishlistButton mediaSlug={`partner-series-${id}`} />
            <ShareButton title={title} />
          </div>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Source externe partenaire. La disponibilité et les droits de diffusion relèvent du
        fournisseur.
      </p>
    </div>
  );
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

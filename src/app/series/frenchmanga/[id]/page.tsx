import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Film, Play } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { prisma } from "@/lib/prisma";
import { fetchMangaDetail } from "@/modules/providers/frenchmanga/frenchmanga.client";

/**
 * Fiche & lecteur d'un manga du catalogue French-Manga.
 *
 * Les flux sont des iframes d'hébergeurs (vidzy, luvid…), récupérés à la
 * demande via l'API JSON du site. La sélection langue/épisode/hôte se fait
 * par navigation serveur (?lang=vostfr&ep=1&host=vidzy) — aucune dépendance
 * client pour le cœur de la navigation.
 */

interface FrenchMangaPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; ep?: string; host?: string }>;
}

// Données vivantes (site externe) : jamais prérendu, toujours à la demande.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: "FRENCHMANGA", externalId: id, contentType: "ANIME" },
      select: { title: true },
    })
    .catch(() => null);
  return {
    title: `${asset?.title ?? "Manga"} — CinéMax`,
    robots: { index: false },
  };
}

export default async function FrenchMangaPage({ params, searchParams }: FrenchMangaPageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const [asset, detail] = await Promise.all([
    prisma.providerAsset
      .findFirst({
        where: { provider: "FRENCHMANGA", externalId: id, contentType: "ANIME" },
        select: { title: true, posterUrl: true, totalEpisodes: true },
      })
      .catch(() => null),
    fetchMangaDetail(id),
  ]);

  const title = asset?.title ?? detail?.title ?? "Manga";
  const streams = detail?.streams.filter((s) => s.url) ?? [];

  if (streams.length === 0) {
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

  // Langues disponibles, épisodes de la langue choisie, hôtes de l'épisode.
  const langs = unique(streams.map((s) => s.lang));
  const lang = langs.includes(sp.lang ?? "") ? (sp.lang as string) : langs[0];
  const episodes = unique(
    streams.filter((s) => s.lang === lang).map((s) => s.episode),
  ).sort((a, b) => a - b);
  const episode = episodes.includes(Number.parseInt(sp.ep ?? "", 10))
    ? Number.parseInt(sp.ep as string, 10)
    : episodes[0];
  const hosts = streams.filter((s) => s.lang === lang && s.episode === episode);
  const selected = hosts.find((s) => s.host === sp.host) ?? hosts[0];

  const base = `/series/frenchmanga/${id}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/animes"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Catalogue animés & mangas
      </Link>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {selected ? (
          <iframe
            key={selected.url}
            src={selected.url}
            title={`${title} — ${lang.toUpperCase()} ép.${episode} (${selected.host})`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Flux introuvable.
          </div>
        )}
      </div>

      {/* Sélecteurs : langue, épisode, hôte */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {langs.map((l) => (
          <Link
            key={l}
            href={`${base}?lang=${encodeURIComponent(l)}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
              l === lang
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {l}
          </Link>
        ))}
      </div>

      {episodes.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {episodes.map((e) => (
            <Link
              key={e}
              href={`${base}?lang=${encodeURIComponent(lang)}&ep=${e}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                e === episode
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Ép. {e}
            </Link>
          ))}
        </div>
      )}

      {hosts.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hosts.map((h) => (
            <Link
              key={h.host}
              href={`${base}?lang=${encodeURIComponent(lang)}&ep=${episode}&host=${encodeURIComponent(h.host)}`}
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
        {asset?.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.posterUrl}
            alt={title}
            className="hidden h-48 w-32 shrink-0 rounded-xl object-cover sm:block"
          />
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {episodes.length > 1 && <span>{episodes.length} épisode(s)</span>}
            {(asset?.totalEpisodes ?? 0) > episodes.length && (
              <span>• {asset?.totalEpisodes} épisodes annoncés</span>
            )}
          </div>
          {detail?.altTitles && Object.keys(detail.altTitles).length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              {Object.entries(detail.altTitles)
                .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                .join(" · ")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`frenchmanga-anime-${id}`} />
            <WishlistButton mediaSlug={`frenchmanga-anime-${id}`} />
            <ShareButton title={title} />
          </div>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Source externe French-Manga. La disponibilité et les droits de diffusion relèvent du
        fournisseur.
      </p>
    </div>
  );
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

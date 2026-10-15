import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Film, Play } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { prisma } from "@/lib/prisma";
import { fetchMovieEmbed } from "@/modules/providers/frenchstream/frenchstream.client";

/**
 * Fiche & lecteur d'un film FrenchStream. Le film n'a qu'un seul flux
 * (embed iframe), extrait de la fiche source (`data-url`).
 */

interface FrenchStreamMoviePageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: FrenchStreamMoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: "FRENCHSTREAM", externalId: id, contentType: "MOVIE" },
      select: { title: true },
    })
    .catch(() => null);
  return { title: `${asset?.title ?? "Film"} — CinéMax`, robots: { index: false } };
}

export default async function FrenchStreamMoviePage({ params }: FrenchStreamMoviePageProps) {
  await connection();
  const { id } = await params;

  const [asset, embedUrl] = await Promise.all([
    prisma.providerAsset
      .findFirst({
        where: { provider: "FRENCHSTREAM", externalId: id, contentType: "MOVIE" },
        select: { title: true, posterUrl: true, releaseYear: true },
      })
      .catch(() => null),
    fetchMovieEmbed(id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/films"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Catalogue films
      </Link>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={asset?.title ?? "Lecteur"}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-400">
            <Film className="h-10 w-10 text-zinc-600" />
            Flux indisponible pour ce film.
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-5">
        {asset?.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.posterUrl}
            alt={asset.title ?? ""}
            className="hidden h-48 w-32 shrink-0 rounded-xl object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-white sm:text-2xl lg:text-3xl">{asset?.title ?? "Film"}</h1>
          {asset?.releaseYear && (
            <div className="mt-1 text-xs text-zinc-400">{asset.releaseYear}</div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`frenchstream-movie-${id}`} />
            <WishlistButton mediaSlug={`frenchstream-movie-${id}`} />
            <ShareButton title={asset?.title ?? "Film"} />
          </div>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Source externe FrenchStream. La disponibilité et les droits de diffusion relèvent du
        fournisseur.
      </p>
    </div>
  );
}

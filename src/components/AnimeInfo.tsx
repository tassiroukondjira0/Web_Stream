import Image from "next/image";
import { Film, Play } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { shouldOptimizeImage } from "@/lib/image";

/** Badge affichant la qualité de lecture. */
function QualityBadge({ quality }: { quality: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border uppercase tracking-tighter ${
        quality === "HD"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : quality === "FHD"
          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
          : "border-zinc-600 bg-zinc-900/50 text-zinc-400"
      }`}
    >
      {quality}
    </span>
  );
}

/** Badge affichant la langue (VF / VOSTFR / VO). */
function LangBadge({ lang }: { lang: string }) {
  const normalized = (lang || "vf").toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border uppercase tracking-tighter ${
        normalized === "vf"
          ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
          : normalized === "vostfr"
          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
          : normalized === "vo"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-zinc-600 bg-zinc-900/50 text-zinc-400"
      }`}
    >
      {normalized.toUpperCase()}
    </span>
  );
}

interface AnimeInfoProps {
  title: string;
  year: number | null;
  totalEpisodes: number;
  quality: string;
  lang: string;
  posterUrl: string | null;
  synopsis: string | null;
  altTitles?: Record<string, string> | null;
  mediaSlug: string;
}

export function AnimeInfo({
  title,
  year,
  totalEpisodes,
  quality,
  lang,
  posterUrl,
  synopsis,
  altTitles,
  mediaSlug,
}: AnimeInfoProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Infos en ligne (titre + badges) */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            {title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            {year && <span className="font-medium text-zinc-200">{year}</span>}
            <span className="border-l border-white/10 pl-3">
              {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <QualityBadge quality={quality} />
          <LangBadge lang={lang} />
        </div>
      </div>

      {/* Affiche + synopsis + métadonnées */}
      <div className="mt-4 flex flex-col sm:flex-row gap-6">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={`Affiche ${title}`}
            width={320}
            height={480}
            unoptimized={!shouldOptimizeImage(posterUrl)}
            className="w-full max-w-xs rounded-xl object-cover bg-zinc-900 shadow-lg border border-white/10"
          />
        ) : (
          <div className="w-full max-w-xs h-64 rounded-xl bg-zinc-900/50 border border-white/10 flex flex-col items-center justify-center">
            <Film className="h-12 w-12 text-zinc-600 mb-2" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Aucune affiche</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {altTitles && Object.keys(altTitles).length > 0 && (
            <p className="mb-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {Object.entries(altTitles)
                .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                .join(" · ")}
            </p>
          )}
          {synopsis && (
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
              {synopsis}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
            </span>
            <span className="w-px h-3 bg-zinc-700" />
            <span>Qualité {quality}</span>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="mt-5 flex flex-wrap gap-3">
        <BookmarkButton mediaSlug={mediaSlug} />
        <WishlistButton mediaSlug={mediaSlug} />
        <ShareButton title={title} />
      </div>

      <p className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Plusieurs sources sont proposées quand elles sont disponibles. La
        disponibilité et les droits de diffusion relèvent des fournisseurs.
      </p>
    </div>
  );
}

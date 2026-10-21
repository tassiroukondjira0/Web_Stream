import Link from "next/link";
import { PosterPlaceholder } from "./PosterPlaceholder";

/** Carte de catalogue générique utilisée partout (homepage, catalogue, recherche). */
export function ProviderPosterCard({
  href,
  posterUrl,
  title,
  year,
  badge,
  badgeTone,
}: {
  href: string;
  posterUrl?: string | null;
  title: string;
  year?: string | null;
  badge?: string;
  badgeTone?: "sky" | "fuchsia";
}) {
  // S'assurer qu'il y a toujours un titre affiché
  const displayTitle = title || "Média";

  const imgSrc = posterUrl || undefined;

  return (
    <Link href={href} className="group relative block overflow-hidden rounded-xl bg-zinc-800/60">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={displayTitle}
          loading="lazy"
          className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <PosterPlaceholder title={displayTitle} />
      )}
      {badge && (
        <span
          className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          {badgeTone === "sky" ? (
            <span className="bg-sky-500/15 text-sky-300">
              {badge}
            </span>
          ) : (
            <span className="bg-fuchsia-500/15 text-fuchsia-300">
              {badge}
            </span>
          )}
        </span>
      )}
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white"
      >
        {displayTitle}
        {year && <span className="ml-1">({year})</span>}
      </div>
    </Link>
  );
}
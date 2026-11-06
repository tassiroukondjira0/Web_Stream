import { connection } from "next/server";
import Link from "next/link";
import { getPartnerMovies, getPartnerSeries, providerItemHref } from "@/lib/provider-catalog";
import type { AssetFilters } from "@/lib/provider-catalog.types";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import {
  Play,
  Tv,
  MonitorPlay,
  Sparkles,
  Apple,
} from "lucide-react";

/** Nombre de titres affichés par plateforme. */
const PLATFORM_LIMIT = 18;

/**
 * Définition d'une plateforme de streaming.
 * Chaque plateforme a un slug (pour filtrer en base), un label, une icône et des couleurs.
 */
interface PlatformDef {
  slug: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Couleur de fond du badge. */
  badgeBg: string;
  /** Couleur du texte du badge. */
  badgeText: string;
}

const PLATFORMS: PlatformDef[] = [
  {
    slug: "netflix",
    label: "Netflix",
    icon: Play,
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-400",
  },
  {
    slug: "prime-video",
    label: "Prime Video",
    icon: MonitorPlay,
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-400",
  },
  {
    slug: "disney",
    label: "Disney+",
    icon: Sparkles,
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
  },
  {
    slug: "apple-tv",
    label: "Apple TV+",
    icon: Apple,
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-300",
  },
];

/**
 * Section dédiée à une plateforme de streaming (Netflix, Prime Video, Disney+, Apple TV+).
 * Affiche les films et séries disponibles sur cette plateforme.
 */
export async function PlatformSection({
  platform,
  filters,
}: {
  platform: string;
  filters?: AssetFilters;
}) {
  await connection();

  const platformFilters: AssetFilters = {
    ...filters,
    platform,
  };

  const [movies, series] = await Promise.all([
    getPartnerMovies(1, PLATFORM_LIMIT, platformFilters),
    getPartnerSeries(1, PLATFORM_LIMIT, platformFilters),
  ]);

  const hasMovies = movies.items.length > 0;
  const hasSeries = series.items.length > 0;

  if (!hasMovies && !hasSeries) return null;

  const def = PLATFORMS.find((p) => p.slug === platform);
  if (!def) return null;

  const Icon = def.icon;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* En-tête de la section */}
      <div className="mb-6 flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md ${def.badgeBg} px-2.5 py-1 text-xs font-semibold ${def.badgeText}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {def.label}
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          Sur {def.label}
        </h2>
      </div>

      {/* Grilles de contenu */}
      <div className="flex flex-col gap-8">
        {hasMovies && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Films</span>
              <Link
                href={`/recherche?platform=${platform}&contentType=MOVIE`}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Tout voir
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
              {movies.items.map((item) => (
                <ProviderPosterCard
                  key={`movie-${item.externalId}`}
                  href={providerItemHref(item)}
                  posterUrl={item.posterUrl}
                  title={item.title}
                  year={item.releaseYear ? String(item.releaseYear) : null}
                />
              ))}
            </div>
          </div>
        )}

        {hasSeries && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Séries</span>
              <Link
                href={`/recherche?platform=${platform}&contentType=SERIES`}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Tout voir
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
              {series.items.map((item) => (
                <ProviderPosterCard
                  key={`series-${item.externalId}`}
                  href={providerItemHref(item)}
                  posterUrl={item.posterUrl}
                  title={item.title}
                  year={item.releaseYear ? String(item.releaseYear) : null}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Groupe toutes les sections plateforme (Netflix, Prime Video, Disney+, Apple TV+).
 */
export async function PlatformSections({ filters }: { filters?: AssetFilters }) {
  await connection();

  const sections: React.ReactNode[] = [];

  for (const platform of PLATFORMS) {
    sections.push(
      <PlatformSection key={platform.slug} platform={platform.slug} filters={filters} />
    );
  }

  return <div className="flex flex-col gap-12">{sections}</div>;
}

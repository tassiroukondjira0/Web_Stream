import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ShieldCheck, Flame, Clapperboard, Globe } from "lucide-react";
import { NewsletterBanner } from "@/components/NewsletterBanner";
import {
  getPartnerAnimes,
  getFeaturedPartner,
  getFrenchStreamMovies,
  getFrenchStreamSeries,
  providerItemHref,
  FEATURED_PERIOD_DAYS,
} from "@/lib/provider-catalog";
import { PosterCarousel } from "@/components/PosterCarousel";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";

/** Nombre de titres affichés dans la vitrine « Mangas ». */
const MANGA_LIMIT = 18;
/** Nombre de titres dans la sélection « À la une » rotative. */
const FEATURED_LIMIT = 16;
/** Nombre de titres par rangée (films / séries) sur l'accueil. */
const RECENT_LIMIT = 12;

export const metadata = {
  title: "CinéMax — Streaming de films et séries",
  description:
    "Découvrez un large catalogue de films, séries et animés en streaming. Nouveautés et coups de cœur.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* À la une — sélection rotative (renouvelée automatiquement) */}
      <Suspense
        fallback={
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
              Chargement de la sélection…
            </div>
          </section>
        }
      >
        <FeaturedSection />
      </Suspense>

      {/* Films & séries — nouveautés en haut du catalogue */}
      <Suspense
        fallback={
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
              Chargement du catalogue…
            </div>
          </section>
        }
      >
        <RecentSection />
      </Suspense>

      {/* Mangas / animés */}
      <Suspense
        fallback={
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
              Chargement des animés…
            </div>
          </section>
        }
      >
        <MangaSection />
      </Suspense>

      {/* Bannière Modèle Freemium */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 p-8 sm:p-12">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
              <ShieldCheck className="h-4 w-4" />
              Accès Illimité
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Profitez d&apos;une expérience cinéma sans interruption
            </h2>
            <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
              En passant à l&apos;offre Premium, débloquez l&apos;intégralité des films exclusifs, la qualité vidéo 4K/UHD, et soutenez directement les artistes et producteurs indépendants.
            </p>
            <div className="mt-6">
              <Link
                href="/premium"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400"
              >
                Découvrir l&apos;abonnement
              </Link>
            </div>
          </div>
        </div>
      </section>

      <NewsletterBanner />
    </div>
  );
}

/**
 * Nouveautés du catalogue — films puis séries, affichés en haut de page.
 * Données issues de la base synchronisée (ProviderAsset publiés par l'admin).
 */
async function RecentSection() {
  const [movies, series] = await Promise.all([
    getFrenchStreamMovies(1, RECENT_LIMIT),
    getFrenchStreamSeries(1, RECENT_LIMIT),
  ]);

  const hasMovies = movies.items.length > 0;
  const hasSeries = series.items.length > 0;

  if (!hasMovies && !hasSeries) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {hasMovies && (
        <div className="mb-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-sky-500" />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Films récents
                </h2>
                <p className="text-xs text-zinc-400 sm:text-sm">
                  Les derniers films ajoutés
                </p>
              </div>
            </div>
            <Link
              href="/films"
              className="text-xs font-medium text-sky-400 hover:text-sky-300 sm:text-sm"
            >
              Tout voir →
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
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-sky-500" />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Séries récentes
                </h2>
                <p className="text-xs text-zinc-400 sm:text-sm">
                  Les dernières séries ajoutées
                </p>
              </div>
            </div>
            <Link
              href="/series"
              className="text-xs font-medium text-sky-400 hover:text-sky-300 sm:text-sm"
            >
              Tout voir →
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
    </section>
  );
}

/** Mangas / animés — vitrine horizontale. */
async function MangaSection() {
  const animes = await getPartnerAnimes(1, MANGA_LIMIT);
  if (animes.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Mangas & animés
          </h2>
          <p className="text-xs text-zinc-400 sm:text-sm">
            Les derniers animés ajoutés
          </p>
        </div>
        <Link
          href="/animes"
          className="text-xs font-medium text-fuchsia-400 hover:text-fuchsia-300 sm:text-sm"
        >
          Tout voir →
        </Link>
      </div>
      <div className="mt-6">
        <PosterCarousel
          items={animes.items.map((item) => ({
            key: `manga-${item.externalId}`,
            href: providerItemHref(item),
            posterUrl: item.posterUrl,
            title: item.title,
            year: item.releaseYear ? String(item.releaseYear) : null,
            badge: item.sourceType === "tv" ? "Série" : "Film",
            badgeTone: item.sourceType === "tv" ? "sky" : "fuchsia",
          }))}
        />
      </div>
    </section>
  );
}

/**
 * « À la une » — vitrine horizontale glissable des films les plus tendance.
 * La sélection suit l'ordre « popular » du fournisseur et se renouvelle
 * automatiquement toutes les FEATURED_PERIOD_DAYS (2 semaines) : sélection
 * déterministe calculée côté données (getFeaturedPartner) — aucun cron requis.
 */
async function FeaturedSection() {
  await connection();

  const { items, renewalLabel } = await getFeaturedPartner(FEATURED_LIMIT);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-r from-zinc-900 via-zinc-900 to-fuchsia-950/30 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-600/30">
            <Flame className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              À la une
            </h2>
            <p className="text-xs text-zinc-400 sm:text-sm">
              Les films les plus tendance — renouvelé toutes les{" "}
              {FEATURED_PERIOD_DAYS} jours (prochaine mise à jour : {renewalLabel})
            </p>
          </div>
        </div>

        <div className="mt-6">
          <PosterCarousel
            size="lg"
            items={items.map((item) => ({
              key: `featured-${item.externalId}`,
              href: item.href,
              posterUrl: item.posterUrl,
              title: item.title,
              year: item.releaseYear ? String(item.releaseYear) : null,
              badge: "Tendance",
              badgeTone: "fuchsia",
            }))}
          />
        </div>
      </div>
    </section>
  );
}

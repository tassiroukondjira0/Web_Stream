import Link from "next/link";
import { Play, Sparkles, Clock, ShieldCheck, Film, Tv } from "lucide-react";

const DEMO_FEATURED = {
  title: "Big Buck Bunny",
  slug: "big-buck-bunny",
  synopsis: "Un classique de l'animation libre en haute définition. Suivez les péripéties d'un lapin géant au grand cœur confronté à un trio de petits tyrans de la forêt.",
  duration: "10 min",
  year: 2008,
  genre: "Animation • Comédie",
  access: "Gratuit",
  backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600",
};

const DEMO_CATALOG = [
  {
    title: "Sintel",
    slug: "sintel",
    type: "Film",
    year: 2010,
    duration: "15 min",
    genre: "Aventure • Fantastique",
    access: "Gratuit",
    isPremium: false,
    poster: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sintel_poster.jpg",
  },
  {
    title: "Tears of Steel",
    slug: "tears-of-steel",
    type: "Film",
    year: 2012,
    duration: "12 min",
    genre: "Science-Fiction",
    access: "Premium",
    isPremium: true,
    poster: "https://upload.wikimedia.org/wikipedia/commons/0/02/Tears_of_Steel_poster.jpg",
  },
  {
    title: "Cosmos Laundromat",
    slug: "cosmos-laundromat",
    type: "Film",
    year: 2015,
    duration: "12 min",
    genre: "Animation • Sci-Fi",
    access: "Premium",
    isPremium: true,
    poster: "https://upload.wikimedia.org/wikipedia/commons/0/00/Cosmos_Laundromat_poster.jpg",
  },
  {
    title: "Les Chroniques Pionnières",
    slug: "chroniques-pionnieres",
    type: "Série",
    year: 2024,
    duration: "2 épisodes",
    genre: "Documentaire",
    access: "Gratuit",
    isPremium: false,
    poster: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              Contenu à l&apos;affiche
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
              {DEMO_FEATURED.title}
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              {DEMO_FEATURED.genre} • {DEMO_FEATURED.year} • {DEMO_FEATURED.duration}
            </p>
            <p className="mt-4 text-base text-zinc-300 leading-relaxed">
              {DEMO_FEATURED.synopsis}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={`/films/${DEMO_FEATURED.slug}`}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-transform hover:scale-105 hover:bg-red-500"
              >
                <Play className="h-4 w-4 fill-white" />
                Lancer la lecture
              </Link>
              <Link
                href={`/films/${DEMO_FEATURED.slug}`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-zinc-900/60 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-zinc-800"
              >
                Fiche détaillée
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue en vedette */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Nouveautés & Coups de cœur
            </h2>
            <p className="text-xs text-zinc-400 sm:text-sm">
              Sélection disponible en haute fidélité visuelle et sonore
            </p>
          </div>
          <Link
            href="/films"
            className="text-xs font-medium text-red-400 hover:text-red-300 sm:text-sm"
          >
            Tout voir →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {DEMO_CATALOG.map((item) => (
            <Link
              key={item.slug}
              href={item.type === "Film" ? `/films/${item.slug}` : `/series/${item.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900/60 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/50"
            >
              {/* Badge Freemium */}
              <div className="absolute top-2.5 right-2.5 z-10">
                {item.isPremium ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-md">
                    <ShieldCheck className="h-3 w-3" />
                    PREMIUM
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-md">
                    GRATUIT
                  </span>
                )}
              </div>

              {/* Affiche */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                    <Play className="h-3 w-3 fill-white" />
                    Visionner
                  </span>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    {item.type === "Film" ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
                    {item.type}
                  </span>
                  <span>•</span>
                  <span>{item.year}</span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">{item.genre}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

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
    </div>
  );
}

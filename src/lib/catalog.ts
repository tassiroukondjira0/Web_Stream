import { prisma } from "./prisma";

export interface MediaItem {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  type: "MOVIE" | "SERIES";
  accessLevel: "FREE" | "PREMIUM";
  releaseYear: number;
  durationMinutes: number | null;
  posterUrl: string;
  backdropUrl: string;
  videoStreamId: string;
  videoUrl?: string;
  isPublished: boolean;
  rightsValidUntil: string;
  categories: { name: string; slug: string }[];
}

export const FALLBACK_CATALOG: MediaItem[] = [
  {
    id: "med-1",
    title: "Big Buck Bunny",
    slug: "big-buck-bunny",
    synopsis:
      "Un classique de l'animation libre en haute définition. Suivez les péripéties d'un lapin géant au grand cœur confronté à un trio de petits tyrans de la forêt qui perturbent la paix de la clairière.",
    type: "MOVIE",
    accessLevel: "FREE",
    releaseYear: 2008,
    durationMinutes: 10,
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg",
    backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600",
    videoStreamId: "demo-bunny",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    isPublished: true,
    rightsValidUntil: "2030-12-31",
    categories: [
      { name: "Animation", slug: "animation" },
      { name: "Comédie", slug: "comedie" },
    ],
  },
  {
    id: "med-2",
    title: "Sintel",
    slug: "sintel",
    synopsis:
      "Une jeune guerrière solitaire parcourt un monde périlleux et enneigé à la recherche de son dragonneau Scales, enlevé par un prédateur ailé colossal.",
    type: "MOVIE",
    accessLevel: "FREE",
    releaseYear: 2010,
    durationMinutes: 15,
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sintel_poster.jpg",
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600",
    videoStreamId: "demo-sintel",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    isPublished: true,
    rightsValidUntil: "2030-12-31",
    categories: [
      { name: "Animation", slug: "animation" },
      { name: "Action", slug: "action" },
    ],
  },
  {
    id: "med-3",
    title: "Tears of Steel",
    slug: "tears-of-steel",
    synopsis:
      "Dans un futur dystopique à Amsterdam, un détachement de résistants tente d'intercepter une intelligence artificielle belliqueuse en revivant un souvenir sentimental fondateur.",
    type: "MOVIE",
    accessLevel: "PREMIUM",
    releaseYear: 2012,
    durationMinutes: 12,
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/0/02/Tears_of_Steel_poster.jpg",
    backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1600",
    videoStreamId: "demo-tears",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    isPublished: true,
    rightsValidUntil: "2030-12-31",
    categories: [
      { name: "Science-Fiction", slug: "science-fiction" },
      { name: "Action", slug: "action" },
    ],
  },
  {
    id: "med-4",
    title: "Cosmos Laundromat",
    slug: "cosmos-laundromat",
    synopsis:
      "Sur une lande battue par les vents, un mouton en pleine détresse existentielle croise un automate étrange capable d'ouvrir des portails vers des réalités parallèles.",
    type: "MOVIE",
    accessLevel: "PREMIUM",
    releaseYear: 2015,
    durationMinutes: 12,
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/0/00/Cosmos_Laundromat_poster.jpg",
    backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600",
    videoStreamId: "demo-cosmos",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    isPublished: true,
    rightsValidUntil: "2030-12-31",
    categories: [
      { name: "Animation", slug: "animation" },
      { name: "Science-Fiction", slug: "science-fiction" },
    ],
  },
  {
    id: "med-5",
    title: "Les Chroniques Pionnières",
    slug: "chroniques-pionnieres",
    synopsis:
      "Mini-série documentaire et prospective explorant les coulisses de la création numérique et des technologies de diffusion ouvertes.",
    type: "SERIES",
    accessLevel: "FREE",
    releaseYear: 2024,
    durationMinutes: null,
    posterUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800",
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600",
    videoStreamId: "demo-series-1",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    isPublished: true,
    rightsValidUntil: "2032-12-31",
    categories: [
      { name: "Documentaire", slug: "documentaire" },
      { name: "Science-Fiction", slug: "science-fiction" },
    ],
  },
];

export async function getAllMedias(): Promise<MediaItem[]> {
  // N'interroger PostgreSQL que si la base a été démarrée et marquée prête
  if (process.env.DATABASE_READY !== "true") {
    return FALLBACK_CATALOG;
  }

  try {
    const medias = await prisma.media.findMany({
      where: { isPublished: true },
      include: {
        categories: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (medias.length > 0) {
      return medias.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        synopsis: m.synopsis,
        type: m.type as "MOVIE" | "SERIES",
        accessLevel: m.accessLevel as "FREE" | "PREMIUM",
        releaseYear: m.releaseYear,
        durationMinutes: m.durationMinutes,
        posterUrl: m.posterUrl || "",
        backdropUrl: m.backdropUrl || "",
        videoStreamId: m.videoStreamId || "",
        isPublished: m.isPublished,
        rightsValidUntil: m.rightsValidUntil?.toISOString() || "",
        categories: m.categories.map((c) => ({
          name: c.category.name,
          slug: c.category.slug,
        })),
      }));
    }
  } catch {
    // Si une erreur de requête survient, retour gracieux vers le catalogue de secours
  }

  return FALLBACK_CATALOG;
}

export async function getMediaBySlug(slug: string): Promise<MediaItem | null> {
  const all = await getAllMedias();
  return all.find((m) => m.slug === slug) || null;
}

export async function getSimilarMedias(currentSlug: string, categorySlug?: string): Promise<MediaItem[]> {
  const all = await getAllMedias();
  return all
    .filter((m) => m.slug !== currentSlug)
    .filter((m) => !categorySlug || m.categories.some((c) => c.slug === categorySlug))
    .slice(0, 3);
}

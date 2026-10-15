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

// Aucun contenu de démonstration n'est exposé : le catalogue local est
// exclusivement alimenté par la base de données (import admin / TMDB publié).

export async function getAllMedias(): Promise<MediaItem[]> {
  // N'interroger PostgreSQL que si la base a été démarrée et marquée prête
  if (process.env.DATABASE_READY !== "true") {
    return [];
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
  } catch {
    // Erreur de requête : aucun contenu local exposé (aucun catalogue de démo).
    return [];
  }
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

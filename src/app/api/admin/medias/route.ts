import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaItem } from "@/lib/catalog";

const DB_READY = process.env.DATABASE_READY === "true";

function isValidVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname))) &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

/** Convertit un média Prisma (avec ses catégories) en MediaItem pour l'admin. */
function dbMediaToItem(m: {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  type: string;
  accessLevel: string;
  releaseYear: number;
  durationMinutes: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  videoUrl: string | null;
  isPublished: boolean;
  rightsValidUntil: Date | null;
  categories: { category: { name: string; slug: string } }[];
  seasons?: {
    seasonNumber: number;
    episodes: { episodeNumber: number; title: string; videoUrl: string | null }[];
  }[];
}): MediaItem {
  return {
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
    videoUrl: m.videoUrl || "",
    episodeSources: (m.seasons ?? []).flatMap((season) =>
      season.episodes.map((episode) => ({
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        videoUrl: episode.videoUrl || "",
      }))
    ),
    isPublished: m.isPublished,
    rightsValidUntil: m.rightsValidUntil?.toISOString() || "",
    categories: m.categories.map((c) => ({ name: c.category.name, slug: c.category.slug })),
  };
}

// Stockage modifiable en mémoire pour le back-office lorsque la base n'est pas active.
// Vide au démarrage : aucun contenu de démonstration n'est préchargé.
const adminCatalog: MediaItem[] = [];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 }
    );
  }

  const requestedSlug = new URL(request.url).searchParams.get("slug");

  // Lecture depuis la base (brouillons inclus) si elle est active.
  if (DB_READY) {
    if (requestedSlug) {
      try {
        const media = await prisma.media.findUnique({
          where: { slug: requestedSlug },
          include: {
            categories: { include: { category: true } },
            seasons: {
              orderBy: { seasonNumber: "asc" },
              include: { episodes: { orderBy: { episodeNumber: "asc" } } },
            },
          },
        });
        if (!media) {
          return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
        }
        return NextResponse.json({ media: dbMediaToItem(media) });
      } catch (error) {
        console.error("Erreur lecture média admin :", error);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
      }
    }

    try {
      const medias = await prisma.media.findMany({
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
      });

      const items = medias.map(dbMediaToItem);

      // Total des titres partenaires (Partenaire, FrenchManga) — agrégé pour
      // la carte du dashboard. Inclut publiés et masqués.
      let partnerTotal = 0;
      try {
        partnerTotal = await prisma.providerAsset.count();
      } catch {
        partnerTotal = 0;
      }

      if (requestedSlug) {
        const media = adminCatalog.find((item) => item.slug === requestedSlug);
        return media
          ? NextResponse.json({ media })
          : NextResponse.json({ error: "Média introuvable" }, { status: 404 });
      }

      return NextResponse.json({
        medias: items,
        stats: {
          totalMedias: items.length,
          published: items.filter((m) => m.isPublished).length,
          premium: items.filter((m) => m.accessLevel === "PREMIUM").length,
          free: items.filter((m) => m.accessLevel === "FREE").length,
          partnerTotal,
        },
      });
    } catch (error) {
      console.error("Erreur lecture catalogue admin :", error);
      // En cas d'erreur DB, on retombe sur le catalogue mémoire ci-dessous.
    }
  }

  return NextResponse.json({
    medias: adminCatalog,
    stats: {
      totalMedias: adminCatalog.length,
      published: adminCatalog.filter((m) => m.isPublished).length,
      premium: adminCatalog.filter((m) => m.accessLevel === "PREMIUM").length,
      free: adminCatalog.filter((m) => m.accessLevel === "FREE").length,
      // Sans base, aucun titre partenaire n'est synchronisé.
      partnerTotal: 0,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { title, slug, synopsis, accessLevel, type, releaseYear, durationMinutes, rightsValidUntil, videoUrl, isPublished } = body;

    if (!title || !slug || !synopsis) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }
    if (typeof videoUrl === "string" && videoUrl.trim() && !isValidVideoUrl(videoUrl.trim())) {
      return NextResponse.json(
        { error: "INVALID_VIDEO_URL", message: "L'URL vidéo doit être une URL HTTP(S) valide." },
        { status: 400 }
      );
    }

    const existingIndex = adminCatalog.findIndex((m) => m.slug === slug);
    const updatedRecord: MediaItem = {
      id: existingIndex >= 0 ? adminCatalog[existingIndex].id : `med-${Date.now()}`,
      title,
      slug,
      synopsis,
      type: type || "MOVIE",
      accessLevel: accessLevel || "FREE",
      releaseYear: Number(releaseYear) || 2026,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      posterUrl: body.posterUrl || "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800",
      backdropUrl: body.backdropUrl || "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600",
      videoUrl: videoUrl || "",
      isPublished: isPublished ?? true,
      rightsValidUntil: rightsValidUntil || "2030-12-31",
      categories: body.categories || [{ name: "Général", slug: "general" }],
    };

    if (existingIndex >= 0) {
      adminCatalog[existingIndex] = updatedRecord;
    } else {
      adminCatalog.unshift(updatedRecord);
    }

    return NextResponse.json({
      success: true,
      media: updatedRecord,
      message: existingIndex >= 0 ? "Média mis à jour." : "Média créé avec succès.",
    });
  } catch (error) {
    console.error("Erreur création média admin :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug requis" }, { status: 400 });
  }

  const index = adminCatalog.findIndex((m) => m.slug === slug);
  if (index >= 0) {
    adminCatalog.splice(index, 1);
    return NextResponse.json({ success: true, message: "Média retiré du catalogue." });
  }

  return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
}

/**
 * Édition / publication d'un média existant (identifié par son slug).
 * Permet d'attacher une URL vidéo licenciée, de changer le niveau
 * d'accès, la validité des droits et de publier la fiche.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { slug } = body;
    if (!slug) {
      return NextResponse.json({ error: "Slug requis" }, { status: 400 });
    }

    // Champs modifiables (on n'applique que ceux fournis).
    const data: {
      videoUrl?: string | null;
      accessLevel?: "FREE" | "PREMIUM";
      rightsValidUntil?: Date | null;
      isPublished?: boolean;
      durationMinutes?: number | null;
      synopsis?: string;
    } = {};
    const episodeSources: {
      seasonNumber: number;
      episodeNumber: number;
      videoUrl: string | null;
    }[] = [];

    if (typeof body.videoUrl === "string") {
      const value = body.videoUrl.trim();
      if (value && !isValidVideoUrl(value)) {
        return NextResponse.json(
          { error: "INVALID_VIDEO_URL", message: "L'URL vidéo doit être une URL HTTP(S) valide." },
          { status: 400 }
        );
      }
      data.videoUrl = value || null;
    }
    if (body.episodeSources !== undefined) {
      if (!Array.isArray(body.episodeSources)) {
        return NextResponse.json(
          { error: "INVALID_EPISODES", message: "La liste des épisodes est invalide." },
          { status: 400 }
        );
      }

      for (const source of body.episodeSources) {
        const seasonNumber = Number(source?.seasonNumber);
        const episodeNumber = Number(source?.episodeNumber);
        if (
          !Number.isSafeInteger(seasonNumber) ||
          seasonNumber < 1 ||
          !Number.isSafeInteger(episodeNumber) ||
          episodeNumber < 1 ||
          typeof source?.videoUrl !== "string"
        ) {
          return NextResponse.json(
            { error: "INVALID_EPISODES", message: "Une URL ou un numéro d'épisode est invalide." },
            { status: 400 }
          );
        }
        const videoUrl = source.videoUrl.trim();
        if (videoUrl && !isValidVideoUrl(videoUrl)) {
          return NextResponse.json(
            { error: "INVALID_VIDEO_URL", message: "Chaque URL d'épisode doit être une URL HTTP(S) valide." },
            { status: 400 }
          );
        }
        episodeSources.push({
          seasonNumber,
          episodeNumber,
          videoUrl: videoUrl || null,
        });
      }
    }
    if (body.accessLevel === "FREE" || body.accessLevel === "PREMIUM") data.accessLevel = body.accessLevel;
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;
    if (body.durationMinutes !== undefined) {
      data.durationMinutes = body.durationMinutes == null ? null : Number(body.durationMinutes);
    }
    if (typeof body.synopsis === "string" && body.synopsis.trim()) data.synopsis = body.synopsis;
    if (body.rightsValidUntil !== undefined) {
      data.rightsValidUntil = body.rightsValidUntil ? new Date(body.rightsValidUntil) : null;
    }

    // Garde-fou : ne pas publier une fiche sans vidéo attachée.
    if (data.isPublished === true) {
      const existing = DB_READY
        ? await prisma.media.findUnique({
            where: { slug },
            select: {
              type: true,
              videoUrl: true,
              seasons: {
                select: {
                  seasonNumber: true,
                  episodes: { select: { episodeNumber: true, videoUrl: true } },
                },
              },
            },
          })
        : null;
      const willHaveVideo =
        data.videoUrl !== undefined
          ? data.videoUrl
          : DB_READY
            ? existing?.videoUrl || null
            : adminCatalog.find((m) => m.slug === slug)?.videoUrl || null;
      const projectedEpisodeUrls = new Map<string, string | null>();
      for (const season of existing?.seasons ?? []) {
        for (const episode of season.episodes) {
          projectedEpisodeUrls.set(
            `${season.seasonNumber}-${episode.episodeNumber}`,
            episode.videoUrl
          );
        }
      }
      for (const source of episodeSources) {
        projectedEpisodeUrls.set(
          `${source.seasonNumber}-${source.episodeNumber}`,
          source.videoUrl
        );
      }
      const hasEpisodeVideo =
        [...projectedEpisodeUrls.values()].some(Boolean) ||
        (!DB_READY && episodeSources.some((source) => source.videoUrl));
      const requiresEpisodeVideo = existing?.type === "SERIES";
      if (
        (requiresEpisodeVideo && !hasEpisodeVideo) ||
        (!requiresEpisodeVideo && !willHaveVideo && !hasEpisodeVideo)
      ) {
        return NextResponse.json(
          { error: "VIDEO_REQUIRED", message: "Impossible de publier sans vidéo licenciée attachée." },
          { status: 400 }
        );
      }
    }

    if (DB_READY) {
      try {
        const existing = await prisma.media.findUnique({ where: { slug } });
        if (!existing) {
          return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
        }
        for (const source of episodeSources) {
          const episode = await prisma.episode.findFirst({
            where: {
              episodeNumber: source.episodeNumber,
              season: { mediaId: existing.id, seasonNumber: source.seasonNumber },
            },
            select: { id: true },
          });
          if (!episode) {
            return NextResponse.json(
              {
                error: "EPISODE_NOT_FOUND",
                message: `Épisode ${source.seasonNumber}x${source.episodeNumber} introuvable.`,
              },
              { status: 400 }
            );
          }
        }

        const updated = await prisma.$transaction(async (tx) => {
          const media = await tx.media.update({ where: { slug }, data });
          for (const source of episodeSources) {
            await tx.episode.updateMany({
              where: {
                episodeNumber: source.episodeNumber,
                season: { mediaId: existing.id, seasonNumber: source.seasonNumber },
              },
              data: { videoUrl: source.videoUrl },
            });
          }
          return media;
        });
        const updatedWithRelations = await prisma.media.findUnique({
          where: { slug },
          include: {
            categories: { include: { category: true } },
            seasons: {
              orderBy: { seasonNumber: "asc" },
              include: { episodes: { orderBy: { episodeNumber: "asc" } } },
            },
          },
        });
        return NextResponse.json({
          success: true,
          message: updated.isPublished ? "Média publié." : "Média mis à jour.",
          media: updatedWithRelations ? dbMediaToItem(updatedWithRelations) : dbMediaToItem({
            ...updated,
            categories: [],
          }),
        });
      } catch (error) {
        console.error("Erreur PATCH média (DB) :", error);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
      }
    }

    // Fallback mémoire
    const idx = adminCatalog.findIndex((m) => m.slug === slug);
    if (idx < 0) {
      return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
    }
    const current = adminCatalog[idx];
    const merged: MediaItem = {
      ...current,
      ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl || "" } : {}),
      ...(episodeSources.length
        ? {
            episodeSources: current.episodeSources?.map((episode) => {
              const update = episodeSources.find(
                (source) =>
                  source.seasonNumber === episode.seasonNumber &&
                  source.episodeNumber === episode.episodeNumber
              );
              return update ? { ...episode, videoUrl: update.videoUrl || "" } : episode;
            }),
          }
        : {}),
      ...(data.accessLevel ? { accessLevel: data.accessLevel } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(data.synopsis ? { synopsis: data.synopsis } : {}),
      rightsValidUntil:
        data.rightsValidUntil !== undefined
          ? data.rightsValidUntil?.toISOString() || ""
          : current.rightsValidUntil,
    };
    adminCatalog[idx] = merged;
    return NextResponse.json({
      success: true,
      message: merged.isPublished ? "Média publié." : "Média mis à jour.",
      media: merged,
    });
  } catch (error) {
    console.error("Erreur PATCH média admin :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

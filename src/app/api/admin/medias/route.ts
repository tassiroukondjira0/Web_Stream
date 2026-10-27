import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaItem } from "@/lib/catalog";
import { AccessLevel, MediaType } from "@prisma/client";

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

/** Convertit un mÃ©dia Prisma (avec ses catÃ©gories) en MediaItem pour l'admin. */
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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 }
    );
  }

  if (!DB_READY) {
    return NextResponse.json({ error: "DB_NOT_READY" }, { status: 503 });
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
          return NextResponse.json({ error: "MÃ©dia introuvable" }, { status: 404 });
        }
        return NextResponse.json({ media: dbMediaToItem(media) });
      } catch (error) {
        console.error("Erreur lecture mÃ©dia admin :", error);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
      }
    }

    try {
      const medias = await prisma.media.findMany({
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
      });

      const items = medias.map(dbMediaToItem);

      // Total des titres partenaires (Partenaire, FrenchManga) â€” agrÃ©gÃ© pour
      // la carte du dashboard. Inclut publiÃ©s et masquÃ©s.
      let partnerTotal = 0;
      try {
        partnerTotal = await prisma.providerAsset.count();
      } catch {
        partnerTotal = 0;
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
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "DB_NOT_READY" }, { status: 503 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 }
    );
  }

  if (!DB_READY) {
    return NextResponse.json({ error: "DB_NOT_READY" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { title, slug, synopsis, accessLevel, type, releaseYear, durationMinutes, rightsValidUntil, videoUrl, isPublished } = body;

    if (typeof title !== "string" || !title.trim() || typeof slug !== "string" || !slug.trim() || typeof synopsis !== "string" || !synopsis.trim()) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }
    if (typeof videoUrl === "string" && videoUrl.trim() && !isValidVideoUrl(videoUrl.trim())) {
      return NextResponse.json(
        { error: "INVALID_VIDEO_URL", message: "L'URL vidÃ©o doit Ãªtre une URL HTTP(S) valide." },
        { status: 400 }
      );
    }

    const mediaType = type === "SERIES" ? MediaType.SERIES : MediaType.MOVIE;
    const mediaAccess = accessLevel === "PREMIUM" ? AccessLevel.PREMIUM : AccessLevel.FREE;
    const parsedYear = Number(releaseYear);
    const parsedDuration = durationMinutes == null || durationMinutes === "" ? null : Number(durationMinutes);
    if (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2200 || (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 1))) {
      return NextResponse.json({ error: "INVALID_MEDIA", message: "AnnÃ©e ou durÃ©e invalide." }, { status: 400 });
    }
    const rightsDate = rightsValidUntil ? new Date(rightsValidUntil) : null;
    if (rightsDate && Number.isNaN(rightsDate.getTime())) {
      return NextResponse.json({ error: "INVALID_RIGHTS_DATE" }, { status: 400 });
    }

    const rawCategories: unknown[] = Array.isArray(body.categories) ? body.categories : [{ name: "GÃ©nÃ©ral", slug: "general" }];
    const categoryData = rawCategories.flatMap((value) => {
      if (typeof value === "string") {
        const categorySlug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return categorySlug ? [{ slug: categorySlug, name: value.trim() }] : [];
      }
      if (value && typeof value === "object" && "name" in value && "slug" in value && typeof value.name === "string" && typeof value.slug === "string") {
        return [{ name: value.name.trim(), slug: value.slug.trim() }];
      }
      return [];
    }).filter((category) => category.name && category.slug);

    const savedMedia = await prisma.$transaction(async (tx) => {
      const existed = await tx.media.findUnique({ where: { slug: slug.trim() }, select: { id: true } });
      const categories = await Promise.all(categoryData.map((category) => tx.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      })));
      const connections = categories.map((category) => ({ category: { connect: { id: category.id } } }));
      const mediaData = {
        title: title.trim(),
        synopsis: synopsis.trim(),
        type: mediaType,
        accessLevel: mediaAccess,
        releaseYear: parsedYear,
        durationMinutes: parsedDuration,
        posterUrl: typeof body.posterUrl === "string" && body.posterUrl.trim() ? body.posterUrl.trim() : null,
        backdropUrl: typeof body.backdropUrl === "string" && body.backdropUrl.trim() ? body.backdropUrl.trim() : null,
        videoUrl: typeof videoUrl === "string" && videoUrl.trim() ? videoUrl.trim() : null,
        // Une fiche sans source ne doit pas apparaÃ®tre comme publiÃ©e.
        isPublished: isPublished === true && typeof videoUrl === "string" && Boolean(videoUrl.trim()),
        rightsValidUntil: rightsDate,
      };
      await tx.media.upsert({
        where: { slug: slug.trim() },
        create: { ...mediaData, slug: slug.trim(), categories: { create: connections } },
        update: { ...mediaData, categories: { deleteMany: {}, create: connections } },
      });
      const media = await tx.media.findUniqueOrThrow({
        where: { slug: slug.trim() },
        include: { categories: { include: { category: true } }, seasons: { include: { episodes: true } } },
      });
      return { media, created: !existed };
    });
    const updatedRecord = dbMediaToItem(savedMedia.media);

    return NextResponse.json({
      success: true,
      media: updatedRecord,
      message: savedMedia.created ? "MÃ©dia crÃ©Ã© avec succÃ¨s." : "MÃ©dia mis Ã  jour.",
    });
  } catch (error) {
    console.error("Erreur crÃ©ation mÃ©dia admin :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 }
    );
  }

  if (!DB_READY) {
    return NextResponse.json({ error: "DB_NOT_READY" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug requis" }, { status: 400 });
  }

  try {
    const deleted = await prisma.media.deleteMany({ where: { slug } });
    if (deleted.count > 0) {
    return NextResponse.json({ success: true, message: "MÃ©dia retirÃ© du catalogue." });
    }
  } catch (error) {
    console.error("Erreur suppression mÃ©dia admin :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ error: "MÃ©dia introuvable" }, { status: 404 });
}

/**
 * Ã‰dition / publication d'un mÃ©dia existant (identifiÃ© par son slug).
 * Permet d'attacher une URL vidÃ©o licenciÃ©e, de changer le niveau
 * d'accÃ¨s, la validitÃ© des droits et de publier la fiche.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 }
    );
  }

  if (!DB_READY) {
    return NextResponse.json({ error: "DB_NOT_READY" }, { status: 503 });
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
          { error: "INVALID_VIDEO_URL", message: "L'URL vidÃ©o doit Ãªtre une URL HTTP(S) valide." },
          { status: 400 }
        );
      }
      data.videoUrl = value || null;
    }
    if (body.episodeSources !== undefined) {
      if (!Array.isArray(body.episodeSources)) {
        return NextResponse.json(
          { error: "INVALID_EPISODES", message: "La liste des Ã©pisodes est invalide." },
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
            { error: "INVALID_EPISODES", message: "Une URL ou un numÃ©ro d'Ã©pisode est invalide." },
            { status: 400 }
          );
        }
        const videoUrl = source.videoUrl.trim();
        if (videoUrl && !isValidVideoUrl(videoUrl)) {
          return NextResponse.json(
            { error: "INVALID_VIDEO_URL", message: "Chaque URL d'Ã©pisode doit Ãªtre une URL HTTP(S) valide." },
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

    // Garde-fou : ne pas publier une fiche sans vidÃ©o attachÃ©e.
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
          : existing?.videoUrl || null;
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
      const hasEpisodeVideo = [...projectedEpisodeUrls.values()].some(Boolean);
      const requiresEpisodeVideo = existing?.type === "SERIES";
      if (
        (requiresEpisodeVideo && !hasEpisodeVideo) ||
        (!requiresEpisodeVideo && !willHaveVideo && !hasEpisodeVideo)
      ) {
        return NextResponse.json(
          { error: "VIDEO_REQUIRED", message: "Impossible de publier sans vidÃ©o licenciÃ©e attachÃ©e." },
          { status: 400 }
        );
      }
    }

    if (DB_READY) {
      try {
        const existing = await prisma.media.findUnique({ where: { slug } });
        if (!existing) {
          return NextResponse.json({ error: "MÃ©dia introuvable" }, { status: 404 });
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
                message: `Ã‰pisode ${source.seasonNumber}x${source.episodeNumber} introuvable.`,
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
          message: updated.isPublished ? "MÃ©dia publiÃ©." : "MÃ©dia mis Ã  jour.",
          media: updatedWithRelations ? dbMediaToItem(updatedWithRelations) : dbMediaToItem({
            ...updated,
            categories: [],
          }),
        });
      } catch (error) {
        console.error("Erreur PATCH mÃ©dia (DB) :", error);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "DB_NOT_READY" }, { status: 503 });
  } catch (error) {
    console.error("Erreur PATCH mÃ©dia admin :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}




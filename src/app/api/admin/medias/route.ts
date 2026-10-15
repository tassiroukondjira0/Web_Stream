import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FALLBACK_CATALOG, MediaItem } from "@/lib/catalog";

const DB_READY = process.env.DATABASE_READY === "true";

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
  videoStreamId: string | null;
  isPublished: boolean;
  rightsValidUntil: Date | null;
  categories: { category: { name: string; slug: string } }[];
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
    videoStreamId: m.videoStreamId || "",
    isPublished: m.isPublished,
    rightsValidUntil: m.rightsValidUntil?.toISOString() || "",
    categories: m.categories.map((c) => ({ name: c.category.name, slug: c.category.slug })),
  };
}

// Stockage modifiable en mémoire pour le back-office en mode démo / sans base active
const adminCatalog: MediaItem[] = [...FALLBACK_CATALOG];

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 }
    );
  }

  // Lecture depuis la base (brouillons inclus) si elle est active.
  if (DB_READY) {
    try {
      const medias = await prisma.media.findMany({
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
      });

      const items = medias.map(dbMediaToItem);

      // Total des titres partenaires (FrenchStream, FrenchManga) — agrégé pour
      // la carte du dashboard. Inclut publiés et masqués.
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
      videoStreamId: body.videoStreamId || `stream-${Date.now()}`,
      videoUrl: videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
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
 * Permet d'attacher une vidéo licenciée (videoStreamId), de changer le niveau
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
      videoStreamId?: string;
      accessLevel?: "FREE" | "PREMIUM";
      rightsValidUntil?: Date | null;
      isPublished?: boolean;
      durationMinutes?: number | null;
      synopsis?: string;
    } = {};

    if (typeof body.videoStreamId === "string") data.videoStreamId = body.videoStreamId || null;
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
      const willHaveVideo =
        (data.videoStreamId !== undefined && data.videoStreamId) ||
        (data.videoStreamId === undefined &&
          (DB_READY
            ? (await prisma.media.findUnique({ where: { slug }, select: { videoStreamId: true } }))
                ?.videoStreamId
            : adminCatalog.find((m) => m.slug === slug)?.videoStreamId));
      if (!willHaveVideo) {
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
        const updated = await prisma.media.update({ where: { slug }, data });
        return NextResponse.json({
          success: true,
          message: updated.isPublished ? "Média publié." : "Média mis à jour.",
          media: dbMediaToItem({
            ...updated,
            categories: (
              await prisma.media.findUnique({
                where: { slug },
                include: { categories: { include: { category: true } } },
              })
            )?.categories ?? [],
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
      ...(data.videoStreamId !== undefined ? { videoStreamId: data.videoStreamId } : {}),
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

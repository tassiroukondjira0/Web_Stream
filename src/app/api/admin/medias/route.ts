import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllMedias, FALLBACK_CATALOG, MediaItem } from "@/lib/catalog";

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

  return NextResponse.json({
    medias: adminCatalog,
    stats: {
      totalMedias: adminCatalog.length,
      published: adminCatalog.filter((m) => m.isPublished).length,
      premium: adminCatalog.filter((m) => m.accessLevel === "PREMIUM").length,
      free: adminCatalog.filter((m) => m.accessLevel === "FREE").length,
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
      videoUrl: videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
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

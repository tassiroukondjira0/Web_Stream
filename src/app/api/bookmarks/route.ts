import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Stockage isolé par utilisateur
const memoryBookmarks = new Map<string, Set<string>>();

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { mediaSlug } = await request.json();
    if (!mediaSlug) {
      return NextResponse.json({ error: "Média requis" }, { status: 400 });
    }

    const userSet = memoryBookmarks.get(user.id) || new Set<string>();
    let bookmarked = false;

    if (userSet.has(mediaSlug)) {
      userSet.delete(mediaSlug);
      bookmarked = false;
    } else {
      userSet.add(mediaSlug);
      bookmarked = true;
    }

    memoryBookmarks.set(user.id, userSet);

    return NextResponse.json({
      success: true,
      mediaSlug,
      isBookmarked: bookmarked,
    });
  } catch (error) {
    console.error("Erreur favoris :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const set = memoryBookmarks.get(user.id) || new Set<string>();
  return NextResponse.json({ bookmarks: Array.from(set) });
}

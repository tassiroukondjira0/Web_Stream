import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// En mémoire si la base n'est pas encore connectée
const memoryHistory = new Map<string, { mediaSlug: string; progressSeconds: number; totalSeconds: number; updatedAt: string }[]>();

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { mediaSlug, progressSeconds, totalSeconds } = await request.json();

    if (!mediaSlug || typeof progressSeconds !== "number") {
      return NextResponse.json({ error: "Données de progression invalides" }, { status: 400 });
    }

    const userHistories = memoryHistory.get(user.id) || [];
    const existingIndex = userHistories.findIndex((h) => h.mediaSlug === mediaSlug);

    const record = {
      mediaSlug,
      progressSeconds: Math.floor(progressSeconds),
      totalSeconds: Math.floor(totalSeconds || 0),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      userHistories[existingIndex] = record;
    } else {
      userHistories.unshift(record);
    }

    memoryHistory.set(user.id, userHistories.slice(0, 50));

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Erreur historique :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const history = memoryHistory.get(user.id) || [];
  return NextResponse.json({ history });
}

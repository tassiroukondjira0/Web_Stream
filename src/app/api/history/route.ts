import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/auth";

/**
 * Progression de lecture persistée en base (table `playback_progress`).
 *
 * Le slug identifie le titre, local (`Media.slug`) ou externe
 * (`partner-series-…`, `tmdb-movie-…`). Aucune FK vers Media pour couvrir le
 * catalogue partenaire. `episodeKey` distingue les épisodes d'une série
 * ("s2e5") et vaut "" pour un film.
 */

function episodeKey(season: unknown, episode: unknown): string {
  const s = typeof season === "number" && Number.isFinite(season) ? Math.floor(season) : null;
  const e = typeof episode === "number" && Number.isFinite(episode) ? Math.floor(episode) : null;
  return s === null && e === null ? "" : `s${s ?? 0}e${e ?? 0}`;
}

function parseNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : null;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          mediaSlug?: unknown;
          season?: unknown;
          episode?: unknown;
          progressSeconds?: unknown;
          totalSeconds?: unknown;
        }
      | null;

    if (!body || typeof body.mediaSlug !== "string" || !body.mediaSlug.trim()) {
      return NextResponse.json({ error: "Données de progression invalides" }, { status: 400 });
    }

    const progress = parseNumber(body.progressSeconds);
    if (progress === null || progress < 0) {
      return NextResponse.json({ error: "Données de progression invalides" }, { status: 400 });
    }

    const total = Math.max(0, parseNumber(body.totalSeconds) ?? 0);
    const season = parseNumber(body.season);
    const episode = parseNumber(body.episode);
    const mediaSlug = body.mediaSlug.trim();
    const key = episodeKey(season, episode);
    const completed = total > 0 && progress >= total * 0.95;

    const record = await prisma.playbackProgress.upsert({
      where: {
        userId_mediaSlug_episodeKey: {
          userId: user.id,
          mediaSlug,
          episodeKey: key,
        },
      },
      create: {
        userId: user.id,
        mediaSlug,
        episodeKey: key,
        seasonNumber: season,
        episodeNumber: episode,
        progressSeconds: progress,
        totalSeconds: total,
        completed,
      },
      update: {
        seasonNumber: season,
        episodeNumber: episode,
        progressSeconds: progress,
        totalSeconds: total,
        completed,
      },
      select: {
        mediaSlug: true,
        episodeKey: true,
        seasonNumber: true,
        episodeNumber: true,
        progressSeconds: true,
        totalSeconds: true,
        completed: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Erreur historique :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const url = new URL(request.url);
    const mediaSlug = url.searchParams.get("mediaSlug")?.trim() || null;

    if (mediaSlug) {
      const season = parseNumber(url.searchParams.get("season"));
      const episode = parseNumber(url.searchParams.get("episode"));
      const key = episodeKey(season, episode);
      const progress = await prisma.playbackProgress.findUnique({
        where: {
          userId_mediaSlug_episodeKey: {
            userId: user.id,
            mediaSlug,
            episodeKey: key,
          },
        },
        select: {
          mediaSlug: true,
          episodeKey: true,
          seasonNumber: true,
          episodeNumber: true,
          progressSeconds: true,
          totalSeconds: true,
          completed: true,
          updatedAt: true,
        },
      });
      return NextResponse.json({ progress });
    }

    const history = await prisma.playbackProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        mediaSlug: true,
        episodeKey: true,
        seasonNumber: true,
        episodeNumber: true,
        progressSeconds: true,
        totalSeconds: true,
        completed: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Erreur historique :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

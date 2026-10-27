import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PLATFORM_SYNC_PROVIDER,
  syncPlatformCatalog,
} from "@/modules/providers/tmdb/platform.sync";
import { TMDB_PROVIDER } from "@/modules/providers/tmdb/tmdb.client";

/**
 * Synchro des plateformes de diffusion (Netflix, Prime Video, Disney+,
 * Paramount+, Apple TV+) â€” mÃ©tadonnÃ©es TMDB via `/discover`.
 *
 * - GET  : Ã©tat de la synchro (compteurs de titres taguÃ©s + historique).
 * - POST : lance une synchro (nombre de pages par liste paramÃ©trable).
 */

const MAX_PAGES = 20;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 },
    );
  }

  try {
    const [tagged, runs] = await Promise.all([
      prisma.providerAsset.count({
        where: { provider: TMDB_PROVIDER, platforms: { not: null } },
      }),
      prisma.providerSyncRun.findMany({
        where: { provider: PLATFORM_SYNC_PROVIDER },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      success: true,
      assets: { tagged },
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        pagesFetched: r.pagesFetched,
        assetsUpserted: r.assetsUpserted,
        error: r.error,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, message: "Base indisponible." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 },
    );
  }

  let pages = 3;
  let platforms: string[] | undefined;
  try {
    const body = await request.json();
    if (typeof body?.pages === "number") {
      pages = Math.min(Math.max(Math.floor(body.pages), 1), MAX_PAGES);
    }
    if (Array.isArray(body?.platforms)) {
      platforms = body.platforms.filter((p: unknown): p is string => typeof p === "string");
    }
  } catch {
    // corps vide ou invalide â†’ on garde les valeurs par dÃ©faut
  }

  try {
    const report = await syncPlatformCatalog({ pages, platforms });
    return NextResponse.json({
      success: true,
      message: `Synchro plateformes terminÃ©e : ${report.fetched} titres remontÃ©s, ${report.upserted} en base.`,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la synchro : ${String(error)}` },
      { status: 500 },
    );
  }
}






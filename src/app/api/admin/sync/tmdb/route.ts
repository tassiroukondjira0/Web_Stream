import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TMDB_PROVIDER } from "@/modules/providers/tmdb/tmdb.client";
import { syncTmdbCatalog } from "@/modules/providers/tmdb/tmdb.sync";

/**
 * Synchro incrÃ©mentale du catalogue TMDB (films + sÃ©ries lus via Vidzy).
 *
 * - GET  : Ã©tat du catalogue TMDB (compteurs + historique des synchros).
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
    const [total, movies, series, runs] = await Promise.all([
      prisma.providerAsset.count({ where: { provider: TMDB_PROVIDER } }),
      prisma.providerAsset.count({
        where: { provider: TMDB_PROVIDER, contentType: "MOVIE" },
      }),
      prisma.providerAsset.count({
        where: { provider: TMDB_PROVIDER, contentType: "SERIES" },
      }),
      prisma.providerSyncRun.findMany({
        where: { provider: TMDB_PROVIDER },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      success: true,
      assets: { total, movies, series, animes: 0 },
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        pagesFetched: r.pagesFetched,
        assetsUpserted: r.assetsUpserted,
        assetsPruned: r.assetsPruned,
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

  let pages = 2;
  try {
    const body = await request.json();
    if (typeof body?.pages === "number") {
      pages = Math.min(Math.max(Math.floor(body.pages), 1), MAX_PAGES);
    }
  } catch {
    // corps vide ou invalide â†’ on garde la valeur par dÃ©faut
  }

  try {
    const report = await syncTmdbCatalog({ pages });
    return NextResponse.json({
      success: true,
      message: `Synchro TMDB terminÃ©e : ${report.fetched} titres rÃ©cupÃ©rÃ©s, ${report.upserted} en base (${report.pruned} obsolÃ¨tes retirÃ©s, ${report.duplicatesHidden} doublons FRENCHSTREAM masquÃ©s).`,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la synchro : ${String(error)}` },
      { status: 500 },
    );
  }
}



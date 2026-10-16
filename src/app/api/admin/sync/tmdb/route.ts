import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TMDB_PROVIDER } from "@/modules/providers/tmdb/tmdb.client";
import { syncTmdbCatalog } from "@/modules/providers/tmdb/tmdb.sync";

/**
 * Synchro incrémentale du catalogue TMDB (films + séries lus via Vidzy).
 *
 * - GET  : état du catalogue TMDB (compteurs + historique des synchros).
 * - POST : lance une synchro (nombre de pages par liste paramétrable).
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
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
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
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
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
    // corps vide ou invalide → on garde la valeur par défaut
  }

  try {
    const report = await syncTmdbCatalog({ pages });
    return NextResponse.json({
      success: true,
      message: `Synchro TMDB terminée : ${report.fetched} titres récupérés, ${report.upserted} en base (${report.pruned} obsolètes retirés, ${report.duplicatesHidden} doublons FRENCHSTREAM masqués).`,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la synchro : ${String(error)}` },
      { status: 500 },
    );
  }
}

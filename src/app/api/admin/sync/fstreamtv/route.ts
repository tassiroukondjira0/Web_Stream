import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FSTREAMTV_PROVIDER } from "@/modules/providers/fstreamtv/fstreamtv.client";
import { syncFStreamTvCatalog } from "@/modules/providers/fstreamtv/fstreamtv.sync";

/**
 * Synchro incrÃ©mentale du fournisseur de repli `french-streaming.tv`.
 *
 * - GET  : Ã©tat du catalogue (compteurs films/sÃ©ries + historique des synchros).
 * - POST : lance une synchro (nombre de pages films/sÃ©ries paramÃ©trable).
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
      prisma.providerAsset.count({ where: { provider: FSTREAMTV_PROVIDER } }),
      prisma.providerAsset.count({
        where: { provider: FSTREAMTV_PROVIDER, contentType: "MOVIE" },
      }),
      prisma.providerAsset.count({
        where: { provider: FSTREAMTV_PROVIDER, contentType: "SERIES" },
      }),
      prisma.providerSyncRun.findMany({
        where: { provider: FSTREAMTV_PROVIDER },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      success: true,
      assets: { total, movies, series },
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
    const report = await syncFStreamTvCatalog({ filmPages: pages, seriesPages: pages });
    return NextResponse.json({
      success: true,
      message: `Synchro terminÃ©e : ${report.fetchedMovies} films et ${report.fetchedSeries} sÃ©ries rÃ©cupÃ©rÃ©s, ${report.upserted} titres en base (${report.pruned} obsolÃ¨tes retirÃ©s).`,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la synchro : ${String(error)}` },
      { status: 500 },
    );
  }
}




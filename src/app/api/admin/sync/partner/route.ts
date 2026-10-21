import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTNER_PROVIDER } from "@/modules/providers/partner/partner.client";
import { syncPartnerCatalog } from "@/modules/providers/partner/partner.sync";

/**
 * Synchro incrémentale du catalogue partenaire.
 *
 * - GET  : état du catalogue (compteurs films/séries + historique des synchros).
 * - POST : lance une synchro (nombre de pages films/séries paramétrable).
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
    const [total, movies, series, animes, runs] = await Promise.all([
      prisma.providerAsset.count({ where: { provider: PARTNER_PROVIDER } }),
      prisma.providerAsset.count({
        where: { provider: PARTNER_PROVIDER, contentType: "MOVIE" },
      }),
      prisma.providerAsset.count({
        where: { provider: PARTNER_PROVIDER, contentType: "SERIES" },
      }),
      prisma.providerAsset.count({
        where: { provider: PARTNER_PROVIDER, contentType: "ANIME" },
      }),
      prisma.providerSyncRun.findMany({
        where: { provider: PARTNER_PROVIDER },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      success: true,
      assets: { total, movies, series, animes },
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
    const report = await syncPartnerCatalog({ filmPages: pages, seriesPages: pages });
    return NextResponse.json({
      success: true,
      message: `Synchro terminée : ${report.fetchedMovies} films et ${report.fetchedSeries} séries récupérés, ${report.upserted} titres en base (${report.pruned} obsolètes retirés).`,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la synchro : ${String(error)}` },
      { status: 500 },
    );
  }
}

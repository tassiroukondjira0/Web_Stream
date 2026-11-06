import { NextResponse } from "next/server";
import { getCurrentUser, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncTargetedTitles } from "@/modules/providers/partner/partner.sync";
import { PARTNER_PROVIDER } from "@/modules/providers/partner/partner.client";

/**
 * Synchronisation ciblée — met à jour les métadonnées et sources d'un titre
 * ou d'un ensemble de titres sélectionnés par l'admin.
 *
 * Le corps peut contenir :
 * - `titles`: tableau de chaînes (titres ou externalIds)
 * - `externalIds`: tableau d'IDs directs
 *
 * Si `titles` est fourni, on recherche d'abord les ProviderAsset correspondants
 * par titre (recherche insensible à la casse) pour trouver leurs externalIds.
 */

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user.role)) return null;
  return user;
}

export async function POST(request: Request) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée au super administrateur." },
      { status: 403 },
    );
  }

  let externalIds: string[] = [];
  try {
    const body = await request.json();

    // Cas 1 : externalIds fournis directement
    if (Array.isArray(body?.externalIds) && body.externalIds.length > 0) {
      externalIds = body.externalIds.filter((id: any) => typeof id === "string").slice(0, 50);
    }
    // Cas 2 : titres fournis — on recherche les externalIds correspondants
    else if (Array.isArray(body?.titles) && body.titles.length > 0) {
      const titleQueries = body.titles
        .filter((t: any) => typeof t === "string" && t.trim().length > 0)
        .map((t: string) => t.trim())
        .slice(0, 50);

      if (titleQueries.length > 0) {
        // Recherche par titre (insensible à la casse)
        const assets = await prisma.providerAsset.findMany({
          where: {
            provider: PARTNER_PROVIDER,
            OR: titleQueries.map((q: string) => ({
              title: { contains: q, mode: "insensitive" as const },
            })),
          },
          select: { externalId: true, title: true },
          take: 50,
        });

        externalIds = assets.map((a) => a.externalId);
      }
    }
    // Cas 3 : search query unique — recherche floue
    else if (typeof body?.search === "string" && body.search.trim().length > 0) {
      const q = body.search.trim();

      // Si c'est un ID numérique direct
      if (/^\d{1,10}$/.test(q)) {
        externalIds = [q];
      } else {
        const assets = await prisma.providerAsset.findMany({
          where: {
            provider: PARTNER_PROVIDER,
            title: { contains: q, mode: "insensitive" as const },
          },
          select: { externalId: true, title: true },
          take: 20,
        });
        externalIds = assets.map((a) => a.externalId);
      }
    }
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Corps de requête invalide. Fournissez `titles`, `externalIds` ou `search`." },
      { status: 400 },
    );
  }

  if (externalIds.length === 0) {
    return NextResponse.json(
      { error: "NO_TITLES", message: "Aucun titre trouvé. Vérifiez vos critères de recherche." },
      { status: 404 },
    );
  }

  try {
    const report = await syncTargetedTitles(externalIds);
    return NextResponse.json({
      success: true,
      message: `Synchro ciblée terminée : ${report.updated} titre(s) mis à jour, ${report.notFound} non trouvé(s), ${report.errors} erreur(s).`,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la synchro ciblée : ${String(error)}` },
      { status: 500 },
    );
  }
}

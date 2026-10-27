import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONTH_LABELS = ["janv.", "fÃ©vr.", "mars", "avr.", "mai", "juin", "juil.", "aoÃ»t", "sept.", "oct.", "nov.", "dÃ©c."];

/** LibellÃ© Â« oct. 2026 Â» pour un mois donnÃ©. */
function monthLabel(year: number, monthIndex: number): string {
  return `${MONTH_LABELS[monthIndex]} ${year}`;
}

/**
 * Statistiques du dashboard admin : trafic mensuel (12 derniers mois),
 * rÃ©partition premium / standard, inscriptions mensuelles et totaux.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action rÃ©servÃ©e aux administrateurs." },
      { status: 403 }
    );
  }

  try {
    const now = new Date();
    const months: { year: number; month: number; label: string; start: Date; end: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      months.push({
        year,
        month,
        label: monthLabel(year, month),
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 1),
      });
    }
    const windowStart = months[0].start;

    const [pageViews, signups, premiumCount, standardCount, totalUsers, totalViews, monthViews, partnerTotal, partnerPublished] =
      await Promise.all([
        prisma.pageView.findMany({
          where: { createdAt: { gte: windowStart } },
          select: { createdAt: true },
        }),
        prisma.user.findMany({
          where: { createdAt: { gte: windowStart } },
          select: { createdAt: true },
        }),
        prisma.user.count({ where: { role: "SUBSCRIBER" } }),
        prisma.user.count({ where: { role: "USER" } }),
        prisma.user.count(),
        prisma.pageView.count(),
        prisma.pageView.count({
          where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        }),
        // Titres partenaires (catalogues externes synchronisÃ©s) : total et publiÃ©s.
        prisma.providerAsset.count(),
        prisma.providerAsset.count({ where: { isPublished: true } }),
      ]);

    const viewsByMonth = months.map((m) => ({
      label: m.label,
      views: pageViews.filter((v) => v.createdAt >= m.start && v.createdAt < m.end).length,
    }));
    const signupsByMonth = months.map((m) => ({
      label: m.label,
      signups: signups.filter((s) => s.createdAt >= m.start && s.createdAt < m.end).length,
    }));

    return NextResponse.json({
      success: true,
      totals: {
        totalUsers,
        premiumUsers: premiumCount,
        standardUsers: standardCount,
        totalViews,
        monthViews,
        partnerTotal,
        partnerPublished,
      },
      viewsByMonth,
      signupsByMonth,
      premiumSplit: [
        { label: "Premium", value: premiumCount },
        { label: "Standard", value: standardCount },
      ],
    });
  } catch (error) {
    console.error("Erreur stats admin :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}



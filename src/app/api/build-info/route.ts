import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint public qui retourne les informations du dernier build EAS Android.
 * Utilisé par AndroidAppBanner pour récupérer le lien de téléchargement APK.
 *
 * Les données sont mises à jour automatiquement par le webhook `/api/eas-webhook`.
 */
export async function GET() {
  try {
    const buildInfo = await prisma.buildInfo.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        buildId: true,
        buildUrl: true,
        artifactUrl: true,
        platform: true,
        updatedAt: true,
      },
    });

    if (!buildInfo) {
      return NextResponse.json(
        { error: "No build info available" },
        { status: 404 }
      );
    }

    return NextResponse.json(buildInfo);
  } catch (error) {
    console.error("[Build Info API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch build info" },
      { status: 500 }
    );
  }
}

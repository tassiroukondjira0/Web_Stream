import { NextResponse } from "next/server";
import { getCurrentUser, hasSuperAdminAccess } from "@/lib/auth";
import { markProviderCoverage } from "@/modules/providers/coverage";

/**
 * Passe de couverture — met à jour `hasSources` sur les assets TMDB.
 *
 * - POST : lance la passe (option `checkVidzy` pour vérifier la disponibilité
 *          sur Vidzy, ce qui est plus lent mais plus précis).
 *
 * Seuls les administrateurs peuvent déclencher cette opération.
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

  let checkVidzy = true;
  try {
    const body = await request.json();
    if (typeof body?.checkVidzy === "boolean") {
      checkVidzy = body.checkVidzy;
    }
  } catch {
    // corps vide → on garde checkVidzy par défaut
  }

  try {
    const report = await markProviderCoverage({ checkVidzy });
    return NextResponse.json({
      success: true,
      message: `${report.markedAvailable} titres marqués disponibles (${report.matchedByTitle} par titre, ${report.matchedByVidzy} par Vidzy), ${report.markedUnavailable} indisponibles.`,
      report: {
        scanned: report.scanned,
        matchedByTitle: report.matchedByTitle,
        matchedByVidzy: report.matchedByVidzy,
        markedAvailable: report.markedAvailable,
        markedUnavailable: report.markedUnavailable,
        durationMs: report.durationMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Erreur lors de la passe de couverture : ${String(error)}` },
      { status: 500 },
    );
  }
}

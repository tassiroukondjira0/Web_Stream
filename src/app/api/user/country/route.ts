import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type CountryCode } from "@/lib/payments";

/**
 * Met à jour le pays de l'utilisateur connecté.
 * Le pays est stocké sous forme de code ISO 3166-1 alpha-2 (ex: SN, CI, CM).
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const country = body?.country;

    if (country !== undefined && country !== null) {
      const countryCode = country as CountryCode;
      if (!(countryCode in { SN: 1, CI: 1, CM: 1, NE: 1, ML: 1, BF: 1, TG: 1, BJ: 1, GN: 1, CG: 1, GA: 1, MA: 1, FR: 1 })) {
        return NextResponse.json({ error: "Pays non supporté." }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { country: country ?? null },
    });

    return NextResponse.json({ ok: true, country: country ?? null });
  } catch (error) {
    console.error("Erreur mise à jour pays utilisateur :", error);
    return NextResponse.json({ error: "Impossible de mettre à jour votre pays." }, { status: 500 });
  }
}

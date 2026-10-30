import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { readRequestBodyLimited } from "@/lib/request-body";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await readRequestBodyLimited(request, 4 * 1024);
    if (!body) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const { token } = input as Record<string, unknown>;
    if (typeof token !== "string" || !token.trim()) {
      return NextResponse.json({ error: "Token requis." }, { status: 400 });
    }

    // Stockage simple dans un champ pushToken de l'utilisateur (si la colonne existe)
    // Sinon on log juste.
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { pushToken: token.trim() },
      });
    } catch {
      console.log("push token (no column):", user.id, token.trim());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push token error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
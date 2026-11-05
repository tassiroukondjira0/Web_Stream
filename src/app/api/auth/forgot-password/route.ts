import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendPasswordResetEmail, generateVerificationCode } from "@/lib/emailjs";
import { cleanupExpiredCodes } from "@/lib/cleanup-codes";

/**
 * POST /api/auth/forgot-password
 * Envoie un code de réinitialisation de mot de passe par email.
 * Body: { email }
 */
export async function POST(request: Request) {
  try {
    // Nettoie les codes expirés avant de traiter la requête
    await cleanupExpiredCodes();

    const retryAfter = rateLimit(request, "auth-forgot-password", 3, 15 * 60_000);
    if (retryAfter) return tooManyRequests(retryAfter);

    const body = await readRequestBodyLimited(request, 512);
    if (!body) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });

    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    if (!input || typeof input !== "object") {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const { email } = input as Record<string, unknown>;

    if (typeof email !== "string") {
      return NextResponse.json({ error: "L'adresse email est requise." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Pour ne pas révéler si l'email existe, on retourne toujours un succès
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Si l'adresse email existe, un code de réinitialisation a été envoyé.",
      });
    }

    // Générer un code de réinitialisation
    const resetCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: resetCode,
        resetCodeExpiry: codeExpiry,
      },
    });

    // Envoyer l'email de réinitialisation
    try {
      await sendPasswordResetEmail(normalizedEmail, resetCode);
      console.log('Email de réinitialisation envoyé à', normalizedEmail);
    } catch (emailErr) {
      console.error('Erreur envoi email réinitialisation:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Si l'adresse email existe, un code de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("Erreur forgot-password :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

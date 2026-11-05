import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { cleanupExpiredCodes } from "@/lib/cleanup-codes";

/**
 * POST /api/auth/reset-password
 * Réinitialise le mot de passe avec le code reçu par email.
 * Body: { email, code, newPassword }
 */
export async function POST(request: Request) {
  try {
    // Nettoie les codes expirés avant de traiter la requête
    await cleanupExpiredCodes();

    const retryAfter = rateLimit(request, "auth-reset-password", 5, 15 * 60_000);
    if (retryAfter) return tooManyRequests(retryAfter);

    const body = await readRequestBodyLimited(request, 1024);
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

    const { email, code, newPassword } = input as Record<string, unknown>;

    if (typeof email !== "string" || typeof code !== "string" || typeof newPassword !== "string") {
      return NextResponse.json({ error: "L'email, le code et le nouveau mot de passe sont requis." }, { status: 400 });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: "Le mot de passe doit contenir entre 8 et 128 caractères." }, { status: 400 });
    }

    // Validation complexité du mot de passe
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const score = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    if (score < 3) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles)." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Ne pas révéler si l'email existe
      return NextResponse.json({
        success: true,
        message: "Si le code est valide, votre mot de passe a été réinitialisé.",
      });
    }

    // Vérifier le code de réinitialisation
    if (user.resetCode !== code) {
      return NextResponse.json({ error: "Code de réinitialisation incorrect." }, { status: 400 });
    }

    // Vérifier l'expiration
    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return NextResponse.json({ error: "Le code a expiré. Demandez un nouveau code." }, { status: 400 });
    }

    // Mettre à jour le mot de passe et nettoyer le code
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été réinitialisé avec succès.",
    });
  } catch (error) {
    console.error("Erreur reset-password :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

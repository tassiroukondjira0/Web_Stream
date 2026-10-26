import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const commonPasswords = new Set([
  "password",
  "password1",
  "password123",
  "password1234",
  "password12345",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "azerty123",
  "iloveyou1",
  "letmein123",
]);

function isPasswordStrong(password: string, email?: string | null): boolean {
  if (password.length < 8 || password.length > 128) return false;
  if (commonPasswords.has(password.toLowerCase())) return false;
  if (email && password.toLowerCase() === email.toLowerCase()) return false;
  if (/(.)\1{3,}/.test(password)) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  return score >= 3;
}

export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(request, "auth-change-password", 5, 15 * 60_000);
    if (retryAfter) return tooManyRequests(retryAfter);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await readRequestBodyLimited(request, 8 * 1024);
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
    const { currentPassword, newPassword, confirmPassword } = input as Record<string, unknown>;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "La confirmation ne correspond pas." }, { status: 400 });
    }
    if (!isPasswordStrong(newPassword, user.email)) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères avec 3 types différents (minuscules, majuscules, chiffres, symboles), sans mots de passe trop courants." },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_READY !== "true") {
      return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true, email: true },
    });
    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json({ error: "Impossible de modifier le mot de passe." }, { status: 400 });
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashed },
    });

    return NextResponse.json({ success: true, message: "Mot de passe modifié avec succès." });
  } catch (error) {
    console.error("Erreur changement mot de passe :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

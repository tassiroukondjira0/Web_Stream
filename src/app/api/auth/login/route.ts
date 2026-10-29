import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSessionToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Plus strict : 10 tentatives par 15 min par IP
    const retryAfter = rateLimit(request, "auth-login", 10, 15 * 60_000);
    if (retryAfter) return tooManyRequests(retryAfter);

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
    const { email, password } = input as Record<string, unknown>;

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
    }
    if (email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
    }
    const emailRetryAfter = rateLimit(request, `auth-login-email:${normalizedEmail}`, 8, 15 * 60_000);
    if (emailRetryAfter) return tooManyRequests(emailRetryAfter);

    if (process.env.DATABASE_READY === "true") {
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!dbUser || !dbUser.passwordHash) {
        return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
      }

      const isValid = await verifyPassword(password, dbUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
      }

      const user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || "Utilisateur",
        role: dbUser.role,
      };

      const sessionToken = await signSessionToken(user);
      const res = NextResponse.json({ success: true, user, token: sessionToken });
      res.cookies.set(COOKIE_NAME, sessionToken, sessionCookieOptions());
      return res;
    }

    // Mode sans base de données : aucun compte n'est persisté de façon fiable,
    // on refuse donc la connexion plutôt que d'ouvrir un accès non contrôlé.
    return NextResponse.json(
      { error: "La base de données n'est pas disponible." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Erreur connexion :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

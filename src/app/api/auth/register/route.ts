import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSessionToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Mémoire tampon pour tests si la base PostgreSQL locale n'est pas encore démarrée
const memoryUsers = new Map<string, { id: string; email: string; name: string; passwordHash: string; role: "USER" | "SUBSCRIBER" | "ADMIN" }>();

export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(request, "auth-register", 5, 60 * 60_000);
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
    const { name, email, password } = input as Record<string, unknown>;

    if (
      typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || password.length < 8 || password.length > 128 ||
      (name !== undefined && (typeof name !== "string" || name.length > 100))
    ) {
      return NextResponse.json(
        { error: "Un e-mail valide et un mot de passe de 8 �� 128 caract��res sont requis." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
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
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const score = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    if (
      commonPasswords.has(password.toLowerCase()) ||
      password.toLowerCase() === normalizedEmail ||
      /^(.)\1{3,}$/.test(password) ||
      score < 3
    ) {
      return NextResponse.json({ error: "Choisissez un mot de passe plus sécurisé (8 caractères minimum, au moins 3 types)." }, { status: 400 });
    }
    if (process.env.DATABASE_READY !== "true") {
      return NextResponse.json({ error: "Inscription indisponible." }, { status: 503 });
    }

    const hashedPassword = await hashPassword(password);

    let user: { id: string; email: string; name: string; role: "USER" | "SUBSCRIBER" | "ADMIN" };

    if (process.env.DATABASE_READY === "true") {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cette adresse e-mail." },
          { status: 409 }
        );
      }

      const created = await prisma.user.create({
        data: {
          name: typeof name === "string" ? name.trim() || "Utilisateur" : "Utilisateur",
          email: normalizedEmail,
          passwordHash: hashedPassword,
          role: "USER",
        },
      });

      user = {
        id: created.id,
        email: created.email,
        name: created.name || "Utilisateur",
        role: created.role,
      };
    } else {
      if (memoryUsers.has(normalizedEmail)) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cette adresse e-mail." },
          { status: 409 }
        );
      }

      const role = "USER" as const;
      const id = `usr-${Date.now()}`;
      const newUser = {
        id,
        email: normalizedEmail,
        name: typeof name === "string" ? name.trim() || "Utilisateur" : "Utilisateur",
        passwordHash: hashedPassword,
        role,
      };
      memoryUsers.set(normalizedEmail, newUser);
      user = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
    }

    const sessionToken = await signSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      message: "Compte créé avec succès.",
    });

    response.cookies.set(COOKIE_NAME, sessionToken, sessionCookieOptions());

    return response;
  } catch (error) {
    console.error("Erreur inscription :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

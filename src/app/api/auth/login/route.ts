import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Comptes de démonstration pour le test immédiat sans base externe
    if (normalizedEmail === "admin@streamweb.local") {
      const user = {
        id: "admin-1",
        email: "admin@streamweb.local",
        name: "Administrateur",
        role: "ADMIN" as const,
      };
      const sessionToken = await signSessionToken(user);
      const res = NextResponse.json({ success: true, user });
      res.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }

    if (normalizedEmail === "abonne@streamweb.local" || normalizedEmail === "premium@streamweb.local") {
      const user = {
        id: "sub-1",
        email: normalizedEmail,
        name: "Abonné Premium",
        role: "SUBSCRIBER" as const,
      };
      const sessionToken = await signSessionToken(user);
      const res = NextResponse.json({ success: true, user });
      res.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }

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
      const res = NextResponse.json({ success: true, user });
      res.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }

    // Utilisateur générique test
    const user = {
      id: `usr-${Date.now()}`,
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      role: "USER" as const,
    };
    const sessionToken = await signSessionToken(user);
    const res = NextResponse.json({ success: true, user });
    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Erreur connexion :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

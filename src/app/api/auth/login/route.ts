import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSessionToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

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

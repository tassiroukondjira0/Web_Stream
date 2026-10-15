import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSessionToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

// Mémoire tampon pour tests si la base PostgreSQL locale n'est pas encore démarrée
const memoryUsers = new Map<string, { id: string; email: string; name: string; passwordHash: string; role: "USER" | "SUBSCRIBER" | "ADMIN" }>();

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "L'e-mail et un mot de passe d'au moins 6 caractères sont requis." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
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

      // Le tout premier compte créé devient automatiquement administrateur.
      const userCount = await prisma.user.count();
      const role: "USER" | "ADMIN" = userCount === 0 ? "ADMIN" : "USER";

      const created = await prisma.user.create({
        data: {
          name: name?.trim() || "Utilisateur",
          email: normalizedEmail,
          passwordHash: hashedPassword,
          role,
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

      // Le tout premier compte créé devient automatiquement administrateur.
      const role: "USER" | "ADMIN" = memoryUsers.size === 0 ? "ADMIN" : "USER";
      const id = `usr-${Date.now()}`;
      const newUser = {
        id,
        email: normalizedEmail,
        name: name?.trim() || "Utilisateur",
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendVerificationEmail, generateVerificationCode } from "@/lib/emailjs";

/**
 * POST /api/auth/verify
 * Vérifie le code de vérification email de l'utilisateur.
 * Body: { email, code }
 */
export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(request, "auth-verify", 10, 5 * 60_000);
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
    
    const { email, code } = input as Record<string, unknown>;
    
    if (typeof email !== "string" || typeof code !== "string") {
      return NextResponse.json({ error: "L'email et le code sont requis." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Aucun compte trouvé avec cette adresse email." }, { status: 404 });
    }

    // Si l'email est déjà vérifié
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "Votre email est déjà vérifié." });
    }

    // Vérifier le code
    if (user.verificationCode !== code) {
      return NextResponse.json({ error: "Code de vérification incorrect." }, { status: 400 });
    }

    // Vérifier l'expiration
    if (!user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
      return NextResponse.json({ error: "Le code a expiré. Demandez un nouveau code." }, { status: 400 });
    }

    // Marquer l'email comme vérifié
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email vérifié avec succès !",
    });
  } catch (error) {
    console.error("Erreur vérification email :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

/**
 * POST /api/auth/verify/resend
 * Renvoie un nouveau code de vérification.
 * Body: { email }
 */
export async function PUT(request: Request) {
  try {
    const retryAfter = rateLimit(request, "auth-verify-resend", 3, 5 * 60_000);
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
      return NextResponse.json({ error: "L'email est requis." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Aucun compte trouvé." }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "Votre email est déjà vérifié." });
    }

    // Générer un nouveau code
    const newCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: newCode,
        verificationCodeExpiry: codeExpiry,
      },
    });

    // Envoyer le nouvel email
    await sendVerificationEmail(normalizedEmail, newCode);

    return NextResponse.json({
      success: true,
      message: "Un nouveau code de vérification a été envoyé.",
    });
  } catch (error) {
    console.error("Erreur renvoi code :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

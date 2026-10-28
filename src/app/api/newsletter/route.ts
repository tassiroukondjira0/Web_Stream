import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const newsletterSubscribers = new Set<string>();

export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(request, "newsletter", 10, 60 * 60_000);
    if (retryAfter) return tooManyRequests(retryAfter);

    const body = await readRequestBodyLimited(request, 4 * 1024);
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
    const { email, consent } = input as Record<string, unknown>;

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json(
        { error: "Le consentement exprès est obligatoire pour l'inscription à la newsletter." },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }

    if (process.env.DATABASE_READY === "true") {
      await prisma.newsletterSubscriber.upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
      });
    } else {
      newsletterSubscribers.add(normalized);
    }

    return NextResponse.json({
      success: true,
      message: "Merci ! Votre inscription aux actualités a été enregistrée.",
    });
  } catch (error) {
    console.error("Erreur newsletter :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

const newsletterSubscribers = new Set<string>();

export async function POST(request: Request) {
  try {
    const { email, consent } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json(
        { error: "Le consentement exprès est obligatoire pour l'inscription à la newsletter." },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();
    newsletterSubscribers.add(normalized);

    return NextResponse.json({
      success: true,
      message: "Merci ! Votre inscription aux actualités a été enregistrée.",
    });
  } catch (error) {
    console.error("Erreur newsletter :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

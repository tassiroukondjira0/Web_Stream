import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  getCurrentUser,
  hasPremiumAccess,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { activatePremium, getCheckoutClient, isPremiumPlan } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * Vérification serveur du statut d'une session de paiement MeSomb.
 *
 * Utilisée au retour du navigateur (`success_url`). Sert de repli lorsque le
 * webhook n'est pas joignable (notamment en développement local sans URL
 * publique) : le statut est interrogé directement auprès du prestataire, jamais
 * déduit du retour du navigateur.
 *
 * En cas de succès confirmé, l'abonnement est activé et le cookie de session est
 * réémis avec le rôle SUBSCRIBER (le rôle est figé dans le JWT).
 */

const SUCCESS_STATUSES = new Set(["SUCCESS", "SUCCEEDED", "COMPLETED", "COMPLETE", "PAID"]);
const FAILED_STATUSES = new Set(["FAILED", "CANCELED", "CANCELLED", "EXPIRED", "INCOMPLETE"]);

function normalizeStatus(status: string | undefined): string {
  return (status || "").trim().toUpperCase();
}

export async function GET(request: Request) {
  // Lecture du cookie hors du try : lors du prérendu, le rejet de `cookies()`
  // doit se propager pour que Next.js bascule la route en rendu dynamique
  // (comportement identique à /api/auth/me). Le rattraper forcerait un prérendu.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  try {
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Paramètre session_id manquant." }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { providerRef: sessionId } });
    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }

    if (!isPremiumPlan(payment.plan)) {
      return NextResponse.json({ error: "Formule de paiement inconnue." }, { status: 409 });
    }

    // Déjà validé : on s'assure simplement que le cookie porte le bon rôle.
    if (payment.status === "PAID") {
      const res = NextResponse.json({ status: "SUCCESS", premium: true, plan: payment.plan });
      if (hasPremiumAccess(user.role)) return res;
      const token = await signSessionToken({ ...user, role: "SUBSCRIBER" });
      res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
      return res;
    }

    const client = getCheckoutClient();
    const session = await client.retrieve(sessionId);
    const providerStatus = normalizeStatus(session.status);

    if (FAILED_STATUSES.has(providerStatus)) {
      return NextResponse.json(
        { status: providerStatus || "FAILED", premium: false, plan: payment.plan, final: true },
        { status: 200 }
      );
    }

    if (!SUCCESS_STATUSES.has(providerStatus)) {
      return NextResponse.json(
        { status: providerStatus || "PENDING", premium: false, plan: payment.plan, final: false },
        { status: 200 }
      );
    }

    await activatePremium({
      providerRef: session.id || sessionId,
      eventRef: `verify_${session.id || sessionId}`,
      eventType: "checkout.session.verified",
      userId: user.id,
      plan: payment.plan,
      amount: session.amount ?? payment.amount,
      currency: session.currency ?? payment.currency,
      rawPayload: session.getData(),
    });

    const res = NextResponse.json({ status: "SUCCESS", premium: true, plan: payment.plan });
    if (!hasPremiumAccess(user.role)) {
      const token = await signSessionToken({ ...user, role: "SUBSCRIBER" });
      res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    }
    return res;
  } catch (error) {
    console.error("Erreur vérification paiement MeSomb :", error);
    return NextResponse.json({ error: "Vérification du paiement impossible." }, { status: 500 });
  }
}

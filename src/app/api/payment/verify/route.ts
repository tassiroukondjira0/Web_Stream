import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  getCurrentUser,
  hasPremiumAccess,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { activatePremium, confirmInvoice, isPremiumPlan, PREMIUM_PLANS } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * Vérification serveur du statut d'une facture PayDunya.
 *
 * Utilisée au retour du navigateur (`return_url`, PayDunya y ajoute
 * `?token=<token>`). Sert de repli lorsque l'IPN n'est pas joignable (notamment
 * en développement local sans URL publique) : le statut est interrogé
 * directement auprès du prestataire, jamais déduit du retour navigateur.
 *
 * En cas de succès confirmé, l'abonnement est activé et le cookie de session est
 * réémis avec le rôle SUBSCRIBER (le rôle est figé dans le JWT).
 */

const SUCCESS_STATUS = "COMPLETED";
const FAILED_STATUSES = new Set(["CANCELLED", "CANCELED", "FAILED"]);

export async function GET(request: Request) {
  // Lecture du cookie hors du try : lors du prérendu, le rejet de `cookies()`
  // doit se propager pour que Next.js bascule la route en rendu dynamique
  // (comportement identique à /api/auth/me). Le rattraper forcerait un prérendu.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const token = params.get("token") || params.get("session_id");

    // Sans token (return_url sans paramètre), on retombe sur la facture en
    // attente la plus récente de l'utilisateur.
    const payment = token
      ? await prisma.payment.findUnique({ where: { providerRef: token } })
      : await prisma.payment.findFirst({
          where: { userId: user.id, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        });

    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }
    if (payment.provider !== "PAYDUNYA" || !["PENDING", "PAID"].includes(payment.status)) {
      return NextResponse.json({ error: "Paiement non vérifiable." }, { status: 409 });
    }

    if (!isPremiumPlan(payment.plan)) {
      return NextResponse.json({ error: "Formule de paiement inconnue." }, { status: 409 });
    }

    // Déjà validé : on s'assure simplement que le cookie porte le bon rôle.
    if (payment.status === "PAID") {
      const res = NextResponse.json({ status: "SUCCESS", premium: true, plan: payment.plan });
      if (hasPremiumAccess(user.role)) return res;
      const token2 = await signSessionToken({ ...user, role: "SUBSCRIBER" });
      res.cookies.set(COOKIE_NAME, token2, sessionCookieOptions());
      return res;
    }

    const confirmed = await confirmInvoice(payment.providerRef);
    const providerStatus = confirmed.status;

    if (FAILED_STATUSES.has(providerStatus)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { status: providerStatus || "FAILED", premium: false, plan: payment.plan, final: true },
        { status: 200 }
      );
    }

    if (providerStatus !== SUCCESS_STATUS) {
      return NextResponse.json(
        { status: providerStatus || "PENDING", premium: false, plan: payment.plan, final: false },
        { status: 200 }
      );
    }

    if (
      confirmed.token !== payment.providerRef ||
      confirmed.amount == null ||
      payment.amount !== PREMIUM_PLANS[payment.plan].amount ||
      confirmed.amount !== payment.amount ||
      confirmed.currency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      console.error("PayDunya invoice does not match the locally initiated payment.", {
        providerRef: payment.providerRef,
      });
      return NextResponse.json({ error: "Montant ou devise du paiement invalide." }, { status: 409 });
    }

    await activatePremium({
      providerRef: confirmed.token || payment.providerRef,
      eventRef: `verify_${payment.providerRef}`,
      eventType: "invoice.verified",
      userId: user.id,
      plan: payment.plan,
      amount: confirmed.amount,
      currency: confirmed.currency,
      provider: "PAYDUNYA",
      rawPayload: confirmed.raw,
    });

    const res = NextResponse.json({ status: "SUCCESS", premium: true, plan: payment.plan });
    if (!hasPremiumAccess(user.role)) {
      const sessionToken = await signSessionToken({ ...user, role: "SUBSCRIBER" });
      res.cookies.set(COOKIE_NAME, sessionToken, sessionCookieOptions());
    }
    return res;
  } catch (error) {
    console.error("Erreur vérification paiement PayDunya :", error);
    return NextResponse.json({ error: "Vérification du paiement impossible." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { capturePayPalOrder } from "@/lib/paypal";
import { activatePremium } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;
    if (!orderId) return NextResponse.json({ error: "orderId manquant." }, { status: 400 });

    const capture = await capturePayPalOrder(orderId);
    if (capture.status !== "COMPLETED") {
      return NextResponse.json({ error: "Paiement non complété." }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { providerRef: orderId } });
    if (!payment) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });

    await activatePremium({
      providerRef: orderId,
      eventRef: capture.captureId || orderId,
      eventType: "PAYPAL_CAPTURE",
      userId: user.id,
      plan: payment.plan as "MONTHLY" | "YEARLY",
      amount: capture.amount,
      currency: capture.currency,
      rawPayload: capture,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PayPal capture :", error);
    return NextResponse.json({ error: "Capture échouée." }, { status: 500 });
  }
}
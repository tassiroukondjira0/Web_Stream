import { NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { activatePremium, isPremiumPlan as isPlan } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";

export async function POST(request: Request) {
  try {
    const body = await readRequestBodyLimited(request, 256 * 1024);
    if (!body) return NextResponse.json({ error: "Notification trop volumineuse." }, { status: 413 });
    const rawBody = new TextDecoder().decode(body);

    const authentic = await verifyPayPalWebhook(request.headers, rawBody);
    if (!authentic) {
      return NextResponse.json({ error: "Signature PayPal invalide." }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Corps illisible." }, { status: 400 });
    }

    const eventType = payload.event_type;
    const resource = (payload.resource ?? {}) as Record<string, unknown>;

    if (eventType !== "PAYMENT.CAPTURE.COMPLETED") {
      return NextResponse.json({ received: true, status: "ignored" });
    }

    const supplementary = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementary?.related_ids as Record<string, unknown> | undefined;
    const orderId = (relatedIds?.order_id as string | undefined) || (resource.id as string | undefined);
    if (!orderId) {
      return NextResponse.json({ error: "orderId introuvable." }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { providerRef: orderId } });
    if (!payment || payment.provider !== "PAYPAL" || !payment.userId || !isPlan(payment.plan)) {
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }
    if (!isPlan(payment.plan)) {
      return NextResponse.json({ error: "Formule inconnue." }, { status: 409 });
    }

    const amountObj = resource.amount as Record<string, unknown> | undefined;
    const amountValue = amountObj?.value;
    const amount = amountValue != null ? Math.round(Number(amountValue) * 100) : payment.amount;
    const currency = typeof amountObj?.currency_code === "string"
      ? (amountObj.currency_code as string).toUpperCase()
      : payment.currency;

    await activatePremium({
      providerRef: orderId,
      eventRef: (resource.id as string | undefined) || orderId,
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      userId: payment.userId,
      plan: payment.plan as "MONTHLY" | "YEARLY",
      amount,
      currency,
      provider: "PAYPAL",
      rawPayload: payload,
    });

    return NextResponse.json({ received: true, status: "ACTIVATED" });
  } catch (error) {
    console.error("Erreur webhook PayPal :", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

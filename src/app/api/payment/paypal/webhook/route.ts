import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const eventType = body?.event_type;
    const resource = body?.resource;

    if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = resource?.id || resource?.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const payment = await prisma.payment.findUnique({ where: { providerRef: orderId } });
        if (payment && payment.status !== "PAID") {
          // Marquer comme payé (la capture sera faite côté client ou ici)
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "PAID", rawPayload: body },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur webhook PayPal :", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
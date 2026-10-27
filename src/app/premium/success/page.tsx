import type { Metadata } from "next";
import { connection } from "next/server";
import PaymentStatus from "./payment-status";

export const metadata: Metadata = {
  title: "Confirmation du paiement — Pass Premium",
  description: "Vérification et activation de votre abonnement Premium.",
  robots: { index: false, follow: false },
};

/** Page dépendant de l'URL (session_id) : rendu à la requête. */
export const instant = false;

export default async function PremiumSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; session_id?: string; provider?: string; orderId?: string }>;
}) {
  await connection();

  const { token, session_id, provider, orderId } = await searchParams;

  return <PaymentStatus sessionId={token ?? session_id ?? null} paypalOrderId={provider === "paypal" ? orderId ?? null : null} />;
}

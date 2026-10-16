import { NextResponse } from "next/server";
import {
  COUNTRY_LABELS,
  PAYMENT_CHANNELS_BY_COUNTRY,
  PAYMENT_METHOD_LABELS,
  type CountryCode,
  type PaymentMethod,
} from "@/lib/payments";

/**
 * Retourne la configuration publique des moyens de paiement Premium :
 * liste des pays supportés et, pour chaque pays, les moyens de paiement disponibles.
 *
 * Cette route est appelée côté client (`premium-client`) pour afficher le
 * sélecteur de pays et le choix du moyen de paiement avant redirection vers PayDunya.
 */
export async function GET() {
  const countries = Object.entries(COUNTRY_LABELS).map(([code, label]) => {
    const byMethod = PAYMENT_CHANNELS_BY_COUNTRY[code as CountryCode] as Record<
      PaymentMethod,
      string[]
    >;
    const methods = Object.entries(byMethod)
      .filter(([, channels]) => channels.length > 0)
      .map(([method]) => ({
        code: method as PaymentMethod,
        label: PAYMENT_METHOD_LABELS[method as PaymentMethod],
      }));

    return { code, label, methods };
  });

  return NextResponse.json({ countries });
}

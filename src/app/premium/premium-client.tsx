"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  Smartphone,
  CreditCard,
  Phone,
  MapPin,
} from "lucide-react";

interface PremiumClientProps {
  user: { name: string; email: string; role: "USER" | "SUBSCRIBER" | "ADMIN" } | null;
  isPremium: boolean;
}

interface Country {
  code: string;
  label: string;
  methods: { code: string; label: string }[];
}

interface PaymentConfigResponse {
  countries: Country[];
}

const PERKS = [
  "Accès illimité à l'intégralité du catalogue de films et séries exclusifs",
  "Qualité vidéo Ultra HD 4K et son spatial immersif",
  "Zéro coupure publicitaire",
  "Reprise de lecture synchronisée sur tous vos écrans",
  "Téléchargement hors ligne (à venir sur mobile)",
  "Rémunération directe reversée aux créateurs et ayants droit",
];

export default function PremiumClient({ user, isPremium }: PremiumClientProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<"MONTHLY" | "YEARLY" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payment/config")
      .then((res) => res.json())
      .then((data: PaymentConfigResponse) => {
        setConfig(data);
        setConfigLoading(false);
      })
      .catch(() => {
        setConfigLoading(false);
        setError("Impossible de charger les moyens de paiement. Réessayez plus tard.");
      });
  }, []);

  const availableMethods = config?.countries.find((c) => c.code === selectedCountry)?.methods ?? [];

  const canSubscribe = Boolean(selectedCountry && selectedPaymentMethod);

  // Persiste le pays choisi sur le profil utilisateur (appel serveur, côté client).
  useEffect(() => {
    if (!user || !selectedCountry) return;

    (async () => {
      try {
        await fetch("/api/user/country", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: selectedCountry }),
        });
      } catch {
        // Échec silencieux : le pays est déjà transmis à l'initiation du paiement.
      }
    })();
  }, [user, selectedCountry]);

  const subscribe = async (plan: "MONTHLY" | "YEARLY") => {
    setError(null);

    if (!user) {
      router.push("/connexion?redirect=/premium");
      return;
    }

    if (!selectedCountry || !selectedPaymentMethod) {
      setError("Veuillez choisir votre pays et votre moyen de paiement avant de souscrire.");
      return;
    }

    if (selectedPaymentMethod === "PAYPAL") {
      setLoadingPlan(plan);
      const res = await fetch("/api/payment/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, country: selectedCountry }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setError(data?.error || "Impossible d'initier le paiement PayPal.");
        setLoadingPlan(null);
        return;
      }
      window.location.href = data.url;
      return;
    }

    try {
      setLoadingPlan(plan);
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          country: selectedCountry,
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        setError(data?.error || "Le paiement n'a pas pu être initié. Réessayez.");
        setLoadingPlan(null);
        return;
      }

      window.location.href = data.url as string;
    } catch {
      setError("Connexion au service de paiement impossible. Vérifiez votre réseau.");
      setLoadingPlan(null);
    }
  };

  const monthlyButtonClasses =
    "block w-full text-center rounded-xl bg-zinc-800 border border-white/10 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const yearlyButtonClasses =
    "block w-full text-center rounded-xl bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed";

  const paymentOptionClasses = (active: boolean) =>
    `flex items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
      active
        ? "border-amber-500 bg-amber-500/10 text-white"
        : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400">
          <Sparkles className="h-3.5 w-3.5" />
          Pass Cinéma Indépendant
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Choisissez l&apos;expérience Premium
        </h1>
        <p className="mt-4 text-base text-zinc-400 leading-relaxed">
          Profitez d&apos;une plateforme de streaming éthique, fluide et performante. Sans engagement, annulable
          en 1 clic.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-500">
          <Smartphone className="h-3.5 w-3.5" />
          Paiement par carte bancaire internationale et Mobile Money sécurisé.
        </div>
      </div>

      {isPremium && (
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-300">
            <Check className="h-4 w-4" />
            Vous bénéficiez déjà de l&apos;accès Premium.
          </p>
        </div>
      )}

      {!isPremium && (
        <>
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-zinc-400" />
                <h3 className="text-sm font-semibold text-white">Votre pays</h3>
              </div>
              {configLoading ? (
                <p className="text-xs text-zinc-400">Chargement des pays…</p>
              ) : config ? (
                <select
                  value={selectedCountry ?? ""}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setSelectedPaymentMethod(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">— Sélectionnez votre pays —</option>
                  {config.countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          {selectedCountry && (
            <div className="mt-6 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Phone className="h-5 w-5 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-white">Moyen de paiement</h3>
                </div>
                {availableMethods.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Aucun moyen de paiement disponible pour ce pays actuellement.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableMethods.map((method) => {
                      const active = selectedPaymentMethod === method.code;
                      return (
                        <button
                          key={method.code}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(method.code)}
                          className={paymentOptionClasses(active)}
                        >
                          {method.code === "CARD" ? (
                            <CreditCard className="h-5 w-5" />
                          ) : (
                            <Phone className="h-5 w-5" />
                          )}
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
              <div className="relative flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/60 p-8 shadow-lg">
                <div className="absolute -top-3.5 left-6 rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Mensuel
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Abonnement Mensuel
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">Sans engagement, résiliable à tout moment</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">1 500</span>
                    <span className="text-sm font-semibold text-zinc-400">FCFA / mois</span>
                  </div>
                  <ul className="mt-8 space-y-3 text-xs text-zinc-300">
                    {PERKS.slice(0, 4).map((perk, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => subscribe("MONTHLY")}
                    disabled={loadingPlan !== null || isPremium || !canSubscribe}
                    className={monthlyButtonClasses}
                  >
                    {loadingPlan === "MONTHLY" ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirection…
                      </span>
                    ) : (
                      "Souscrire mensuellement"
                    )}
                  </button>
                  {!canSubscribe && (
                    <p className="mt-3 text-[11px] text-zinc-500">
                      Choisissez votre pays et moyen de paiement pour activer ce bouton.
                    </p>
                  )}
                </div>
              </div>

              <div className="relative flex flex-col justify-between rounded-3xl border-2 border-amber-500 bg-gradient-to-b from-zinc-900 to-amber-950/20 p-8 shadow-2xl shadow-amber-500/10">
                <div className="absolute -top-3.5 right-6 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-black uppercase tracking-wider">
                  Économisez 2 mois
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Abonnement Annuel
                    <ShieldCheck className="h-5 w-5 text-amber-400" />
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">Le pass le plus avantageux</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-amber-400">15 000</span>
                    <span className="text-sm font-semibold text-zinc-400">FCFA / an</span>
                  </div>
                  <ul className="mt-8 space-y-3 text-xs text-zinc-200">
                    {PERKS.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => subscribe("YEARLY")}
                    disabled={loadingPlan !== null || isPremium || !canSubscribe}
                    className={yearlyButtonClasses}
                  >
                    {loadingPlan === "YEARLY" ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirection…
                      </span>
                    ) : (
                      "Choisir la formule Annuelle"
                    )}
                  </button>
                  {!canSubscribe && (
                    <p className="mt-3 text-[11px] text-zinc-500">
                      Choisissez votre pays et moyen de paiement pour activer ce bouton.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-8 max-w-2xl mx-auto rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="ml-3 text-sm text-red-200">{error}</span>
        </div>
      )}

      <p className="mx-auto mt-10 max-w-2xl text-center text-[11px] leading-relaxed text-zinc-500">
        Le paiement est traité par PayDunya via votre moyen de paiement (carte bancaire ou Mobile Money). L&apos;accès Premium est activé
        automatiquement dès la confirmation de la transaction par le prestataire.
      </p>
    </div>
  );
}

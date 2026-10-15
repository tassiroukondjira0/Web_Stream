"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Sparkles, AlertCircle, Loader2, Smartphone } from "lucide-react";

interface PremiumClientProps {
  user: { name: string; email: string; role: "USER" | "SUBSCRIBER" | "ADMIN" } | null;
  isPremium: boolean;
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

  const subscribe = async (plan: "MONTHLY" | "YEARLY") => {
    setError(null);

    if (!user) {
      router.push("/connexion?redirect=/premium");
      return;
    }

    try {
      setLoadingPlan(plan);
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
          Paiement Mobile Money sécurisé (Wave, Orange Money, MTN MoMo, Moov…)
        </div>
      </div>

      {isPremium && (
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Votre Pass Premium est actif. Bonne séance&nbsp;!
          </p>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0 translate-y-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/60 p-8 shadow-xl">
          <div>
            <h3 className="text-xl font-bold text-white">Abonnement Mensuel</h3>
            <p className="mt-1 text-xs text-zinc-400">Liberté totale, sans engagement</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">2 500</span>
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
              disabled={loadingPlan !== null || isPremium}
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
              <span className="text-4xl font-black text-amber-400">25 000</span>
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
              disabled={loadingPlan !== null || isPremium}
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
          </div>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-[11px] leading-relaxed text-zinc-500">
        Le paiement est traité par MeSomb via votre opérateur Mobile Money. L&apos;accès Premium est activé
        automatiquement dès la confirmation de la transaction par le prestataire.
      </p>
    </div>
  );
}

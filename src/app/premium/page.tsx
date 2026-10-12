import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Sparkles, Film, Zap, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "Abonnement Premium — Accès Intégral & Haute Définition",
  description:
    "Débloquez tout le catalogue en 4K Ultra HD sans publicité, et soutenez directement la création indépendante.",
};

export default function PremiumPage() {
  const perks = [
    "Accès illimité à l'intégralité du catalogue de films et séries exclusifs",
    "Qualité vidéo Ultra HD 4K et son spatial immersif",
    "Zéro coupure publicitaire",
    "Reprise de lecture synchronisée sur tous vos écrans",
    "Téléchargement hors ligne (à venir sur mobile)",
    "Rémunération directe reversée aux créateurs et ayants droit",
  ];

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
          Profitez d&apos;une plateforme de streaming éthique, fluide et performante. Sans engagement, annulable en 1 clic.
        </p>
      </div>

      {/* Grille des tarifs */}
      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Formule Mensuelle */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/60 p-8 shadow-xl">
          <div>
            <h3 className="text-xl font-bold text-white">Abonnement Mensuel</h3>
            <p className="mt-1 text-xs text-zinc-400">Liberté totale, sans engagement</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">2 500</span>
              <span className="text-sm font-semibold text-zinc-400">FCFA / mois</span>
            </div>
            <ul className="mt-8 space-y-3 text-xs text-zinc-300">
              {perks.slice(0, 4).map((perk, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
            <Link
              href="/connexion"
              className="block w-full text-center rounded-xl bg-zinc-800 border border-white/10 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              Souscrire mensuellement
            </Link>
          </div>
        </div>

        {/* Formule Annuelle (Recommandée) */}
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
              {perks.map((perk, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
            <Link
              href="/connexion"
              className="block w-full text-center rounded-xl bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Choisir la formule Annuelle
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

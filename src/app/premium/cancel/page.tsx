import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Paiement annulé — Pass Premium",
  description: "Votre paiement a été annulé. Aucun montant n'a été prélevé.",
  robots: { index: false, follow: false },
};

export default function PremiumCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <XCircle className="mx-auto h-12 w-12 text-zinc-500" />
      <h1 className="mt-6 text-2xl font-bold text-white">Paiement annulé</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
        La transaction a été interrompue. Aucun montant n&apos;a été prélevé et votre accès reste inchangé.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/premium"
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
        >
          Reprendre une formule
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/5 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

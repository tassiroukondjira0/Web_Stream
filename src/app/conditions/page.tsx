import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Modalités d'utilisation du service et procédure légale de retrait des contenus.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Conditions Générales d&apos;Utilisation</h1>
      <p className="mt-2 text-xs text-zinc-400">Dernière mise à jour : 12 Octobre 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Objet du Service</h2>
          <p>
            CinéMax propose une plateforme de diffusion vidéo à la demande en ligne légale, comprenant des œuvres en accès libre (Freemium) et des contenus exclusifs accessibles via un abonnement payant.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Respect des droits de propriété intellectuelle</h2>
          <p>
            Toutes les vidéos diffusées font l&apos;objet de licences d&apos;exploitation valides ou relèvent de licences Creative Commons / du domaine public vérifiées. Toute reproduction, redistribution ou extraction non autorisée est strictement prohibée.
          </p>
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="text-lg font-bold text-red-400 mb-2">
            3. Procédure de retrait des contenus & Réponse aux incidents
          </h2>
          <p>
            Si vous êtes titulaire de droits d&apos;auteur ou représentant légal et estimez qu&apos;un contenu porte atteinte à vos prérogatives :
          </p>
          <ol className="mt-3 list-decimal list-inside space-y-1.5 text-xs text-zinc-300">
            <li>Adressez un avis de signalement complet à <strong>droits@cinemax.local</strong> en précisant le titre de l&apos;œuvre, l&apos;URL précise et la preuve de vos droits.</li>
            <li>Accusé de réception sous 24 heures ouvrées.</li>
            <li>Désactivation immédiate à titre conservatoire de la vidéo sous 48 heures maximum durant l&apos;instruction du litige.</li>
            <li>Retrait définitif et suppression des flux CDN en cas de confirmation de contestation légitime.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Résiliation & Modalités d&apos;abonnement</h2>
          <p>
            L&apos;abonnement au Pass Premium est sans engagement de durée minimale. Vous pouvez interrompre le renouvellement automatique à tout moment sans frais supplémentaires depuis la page Mon Compte.
          </p>
        </section>
      </div>
    </div>
  );
}

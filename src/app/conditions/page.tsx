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
            CinéMax propose une plateforme de diffusion vidéo à la demande en ligne légale, comprenant des œuvres en
            accès libre (formule Freemium) et des contenus exclusifs accessibles via un abonnement payant (Pass Premium).
            Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;usage du site,
            de ses applications et de l&apos;ensemble de ses services.
          </p>
          <p className="mt-2">
            L&apos;utilisation du service implique l&apos;acceptation pleine et entière des présentes CGU. Si vous
            n&apos;acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Accès au service &amp; inscription</h2>
          <p>
            L&apos;accès au catalogue gratuit est ouvert à tout visiteur. La création d&apos;un compte est nécessaire
            pour bénéficier de la reprise de lecture, des favoris, de la liste de souhaits et des contenus réservés aux
            abonnés. Vous devez fournir des informations exactes, avoir l&apos;âge minimum requis par la loi de votre
            pays et être responsable de la confidentialité de vos identifiants.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Respect des droits de propriété intellectuelle</h2>
          <p>
            Toutes les vidéos diffusées font l&apos;objet de licences d&apos;exploitation valides ou relèvent de licences
            libres / du domaine public vérifiées. Toute reproduction, redistribution, extraction, téléchargement,
            diffusion publique ou exploitation non autorisée des contenus est strictement prohibée et susceptible
            d&apos;engager votre responsabilité civile et pénale.
          </p>
        </section>

        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
          <h2 className="text-lg font-bold text-violet-400 mb-2">
            4. Procédure de retrait des contenus &amp; réponse aux incidents
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
          <h2 className="text-lg font-bold text-white mb-2">5. Abonnement, résiliation &amp; remboursement</h2>
          <p>
            L&apos;abonnement au Pass Premium est <strong className="text-white">sans engagement de durée minimale</strong>.
            Vous pouvez interrompre le renouvellement automatique à tout moment, sans frais supplémentaires, depuis la
            page Mon Compte.
          </p>
          <p className="mt-2">
            L&apos;abonnement donne accès aux contenus exclusifs jusqu&apos;à la fin de la période en cours. Sauf
            obligation légale contraire ou droit de rétractation applicable, les sommes versées pour une période entamée
            ne sont pas remboursables au prorata.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Comportement des utilisateurs</h2>
          <p>
            Vous vous engagez à ne pas contourner les mesures de protection des contenus, à ne pas tenter d&apos;accéder
            sans autorisation aux espaces réservés, à ne pas perturber le fonctionnement du service (extraction
            automatisée de données, surcharge des serveurs) et à ne pas usurper l&apos;identité d&apos;un tiers. Tout
            manquement peut entraîner la suspension ou la suppression de votre compte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Responsabilité &amp; disponibilité</h2>
          <p>
            CinéMax met en œuvre tous les moyens raisonnables pour assurer la disponibilité et la qualité du service,
            sans toutefois garantir une disponibilité ininterrompue. CinéMax ne saurait être tenue responsable des
            dommages indirects résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service, ni
            des interruptions liées à la maintenance ou à un cas de force majeure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Modification des CGU &amp; droit applicable</h2>
          <p>
            CinéMax se réserve le droit de faire évoluer les présentes CGU pour refléter les changements du service ou
            de la réglementation. La version applicable est celle publiée sur cette page à la date de votre consultation.
            Les présentes CGU sont soumises au droit applicable dans le pays d&apos;établissement de l&apos;éditeur ; en
            cas de litige, et à défaut de résolution amiable, les tribunaux compétents seront ceux du ressort de
            l&apos;éditeur.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Pour toute question relative à ces conditions, contactez-nous à{" "}
            <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

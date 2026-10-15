import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Engagement sur la protection de la vie privée et des données personnelles sur CinéMax.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Politique de Confidentialité</h1>
      <p className="mt-2 text-xs text-zinc-400">Dernière mise à jour : 12 Octobre 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données est CinéMax. Pour toute question relative à vos données
            personnelles, vous pouvez nous contacter à{" "}
            <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>.
            La présente politique décrit quelles données nous collectons, pourquoi, comment nous les protégeons et
            quels sont vos droits.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Données collectées</h2>
          <p>
            Nous appliquons le principe de minimisation et ne collectons que les données strictement nécessaires au
            fonctionnement du service :
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1.5 text-zinc-300">
            <li>
              <strong className="text-white">Données de compte</strong> : adresse e-mail et mot de passe (haché) pour
              l&apos;authentification, ainsi qu&apos;un nom d&apos;affichage facultatif.
            </li>
            <li>
              <strong className="text-white">Données d&apos;usage</strong> : historique de visionnage et progression de
              lecture, pour vous permettre de reprendre une vidéo là où vous l&apos;avez laissée.
            </li>
            <li>
              <strong className="text-white">Préférences</strong> : favoris, liste de souhaits et langue d&apos;interface.
            </li>
            <li>
              <strong className="text-white">Données techniques anonymes</strong> : pages vues (chemin et horodatage)
              pour les statistiques de fréquentation. Ces visites ne contiennent aucune donnée personnelle identifiante.
            </li>
          </ul>
          <p className="mt-2 text-xs text-zinc-400">
            Nous ne collectons <strong className="text-zinc-300">aucune donnée bancaire</strong>. Les paiements sont
            traités par nos prestataires de paiement ; nous ne conservons que l&apos;identifiant de transaction et les
            montants, jamais vos coordonnées de carte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Finalités &amp; base légale</h2>
          <p>Vos données sont traitées pour des finalités déterminées, explicites et légitimes :</p>
          <ul className="mt-2 list-disc list-inside space-y-1.5 text-zinc-300">
            <li>Création et sécurisation de votre compte (exécution du contrat).</li>
            <li>Fourniture du service de streaming et reprise de lecture (exécution du contrat).</li>
            <li>Envoi de la newsletter, <em>uniquement</em> si vous y avez consenti (consentement).</li>
            <li>Statistiques de fréquentation et amélioration du service (intérêt légitime).</li>
            <li>Respect de nos obligations légales et gestion des signalements de contenu (obligation légale).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Absence de revente &amp; partage</h2>
          <p>
            Vos données ne sont <strong className="text-white">ni vendues, ni louées, ni cédées</strong> à des tiers à
            des fins commerciales. Elles ne sont partagées qu&apos;avec nos sous-traitants techniques (hébergement,
            diffusion vidéo, prestataire de paiement), dans la stricte mesure nécessaire à l&apos;exécution du service
            et conformément à des obligations de confidentialité et de sécurité.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Sécurité &amp; mots de passe</h2>
          <p>
            Les mots de passe sont systématiquement hachés (algorithme Bcrypt) avant tout enregistrement : aucun membre
            de l&apos;équipe ne peut accéder à votre mot de passe en clair. Les échanges sont chiffrés (HTTPS/TLS) et
            l&apos;accès aux données est limité au strict nécessaire (principe du moindre privilège).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Durée de conservation</h2>
          <p>
            Les données de compte sont conservées pendant toute la durée de vie de votre compte, puis supprimées ou
            anonymisées dans un délai raisonnable après sa fermeture. Les données de facturation sont conservées
            conformément aux obligations comptables et fiscales applicables.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Cookies &amp; traceurs</h2>
          <p>
            Nous utilisons des cookies strictement nécessaires au fonctionnement du site (session d&apos;authentification,
            préférences). Nous n&apos;utilisons pas de cookies publicitaires tiers ni de pistage à des fins de profilage
            commercial. Vous pouvez à tout moment configurer votre navigateur pour refuser les cookies non essentiels.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Vos droits (RGPD)</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données, vous disposez d&apos;un droit d&apos;accès,
            de rectification, d&apos;effacement, de limitation et d&apos;opposition, ainsi que du droit à la portabilité
            de vos données. Vous pouvez exercer ces droits depuis la page{" "}
            <Link href="/mon-compte" className="text-amber-400 hover:text-amber-300">Mon Compte</Link> ou par e-mail à{" "}
            <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>.
            La suppression de votre compte efface vos données personnelles associées.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de
            l&apos;autorité de protection des données compétente de votre pays de résidence.
          </p>
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Engagement sur la protection de la vie privée et des données personnelles sur StreamWeb.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Politique de Confidentialité</h1>
      <p className="mt-2 text-xs text-zinc-400">Dernière mise à jour : 12 Octobre 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Données collectées</h2>
          <p>
            Nous limitons la collecte aux données strictement indispensables au fonctionnement de la plateforme :
            adresse e-mail pour l&apos;authentification, préférences de langue, historique de visionnage pour la reprise de lecture, et liste de favoris.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Utilisation des données</h2>
          <p>
            Vos données ne sont ni vendues, ni cédées à des tiers. Elles sont uniquement utilisées pour sécuriser votre compte,
            mémoriser votre progression de lecture et vous adresser la newsletter si vous y avez expressément consenti.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Sécurité des mots de passe</h2>
          <p>
            Les mots de passe sont systématiquement hachés avec l&apos;algorithme Bcrypt avant tout enregistrement. Aucun membre de l&apos;équipe n&apos;a accès à votre mot de passe en clair.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Vos droits (Accès, Rectification, Suppression)</h2>
          <p>
            Vous disposez d&apos;un droit permanent de consultation, modification et suppression de vos données personnelles. Vous pouvez demander la fermeture définitive de votre compte depuis la page Mon Compte ou par e-mail à privacy@streamweb.local.
          </p>
        </section>
      </div>
    </div>
  );
}

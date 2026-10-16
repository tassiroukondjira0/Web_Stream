import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aide & Questions Fréquentes",
  description:
    "Trouvez les réponses à vos questions sur CinéMax : compte, abonnement, paiement, reprise de lecture et confidentialité.",
};

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Comment créer un compte ?",
    answer:
      "Cliquez sur « S'inscrire » depuis la page de connexion, renseignez votre e-mail et un mot de passe d'au moins 6 caractères. Votre compte est créé immédiatement et vous pouvez accéder à vos favoris et votre historique.",
  },
  {
    question: "Comment me connecter ?",
    answer:
      "Rendez-vous sur la page « Connexion », entrez votre adresse e-mail et votre mot de passe, puis validez. Vous serez redirigé vers votre espace personnel « Mon Compte ».",
  },
  {
    question: "J'ai oublié mon mot de passe, que faire ?",
    answer:
      "La réinitialisation de mot de passe n'est pas encore disponible. Contactez-nous à l'adresse indiquée ci-dessous pour récupérer l'accès à votre compte.",
  },
  {
    question: "Qu'est-ce que l'abonnement Premium ?",
    answer:
      "Le pass Premium donne accès au catalogue complet, aux contenus exclusifs et supprime les restrictions des films gratuits. Vous pouvez le souscrire depuis la page « Offre Premium ».",
  },
  {
    question: "Comment reprendre une vidéo là où je me suis arrêté ?",
    answer:
      "Votre progression de lecture est sauvegardée automatiquement toutes les 10 secondes. Retrouvez la reprise de lecture dans votre espace « Mon Compte ».",
  },
  {
    question: "Où trouver mes favoris et ma liste de souhaits ?",
    answer:
      "Ils sont accessibles depuis « Mon Compte » (sections « Mes favoris » et « Ma liste de souhaits »). Vous pouvez ajouter ou retirer un titre depuis sa fiche.",
  },
  {
    question: "Mes données personnelles sont-elles protégées ?",
    answer:
      "Oui. Les mots de passe sont hachés, les échanges sont chiffrés en HTTPS et aucune donnée bancaire n'est stockée sur nos serveurs. Consultez notre Politique de Confidentialité pour plus de détails.",
  },
  {
    question: "Comment supprimer mon compte ?",
    answer:
      "Vous pouvez demander la suppression de votre compte et de vos données personnelles depuis « Mon Compte » ou par e-mail. Cette action est irréversible.",
  },
];

export default function AidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white">Aide & Questions Fréquentes</h1>
        <p className="mt-2 text-xs text-zinc-400">
          Vous ne trouvez pas la réponse à votre question ? Écrivez-nous à{" "}
          <a href="mailto:support@cinemax.local" className="text-amber-400 hover:text-amber-300">
            support@cinemax.local
          </a>
          .
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map(({ question, answer }, index) => (
          <section key={index} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white">{question}</h2>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{answer}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-400">
          Besoin d&apos;aide supplémentaire ? Contactez notre support à{" "}
          <a href="mailto:support@cinemax.local" className="text-amber-400 hover:text-amber-300 font-medium">
            support@cinemax.local
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Dernière mise à jour : 15 Octobre 2026
        </p>
      </div>
    </div>
  );
}

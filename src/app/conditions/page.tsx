import type { Metadata } from "next";
import { BookOpen, Monitor, UserPlus, Copyright, AlertTriangle, CreditCard, MessageSquare, Shield, Server, Gavel, Baby, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Modalités d'utilisation du service CinéMax : accès, abonnements, droits, responsabilités et procédure légale de retrait des contenus.",
};

const sections = [
  { id: "definitions", title: "Définitions", icon: BookOpen },
  { id: "objet", title: "Objet du Service", icon: Monitor },
  { id: "acces", title: "Accès & inscription", icon: UserPlus },
  { id: "propriete", title: "Propriété intellectuelle", icon: Copyright },
  { id: "retrait", title: "Procédure de retrait", icon: AlertTriangle },
  { id: "abonnement", title: "Abonnement & paiement", icon: CreditCard },
  { id: "contenu-utilisateur", title: "Contenu utilisateur", icon: MessageSquare },
  { id: "comportement", title: "Comportement", icon: Shield },
  { id: "responsabilite", title: "Responsabilité", icon: Server },
  { id: "modification", title: "Modification & droit", icon: Gavel },
  { id: "mineurs", title: "Protection des mineurs", icon: Baby },
  { id: "accessibilite", title: "Accessibilité", icon: Eye },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Conditions Générales d&apos;Utilisation</h1>
      <p className="mt-2 text-xs text-zinc-400">Dernière mise à jour : 12 Octobre 2026 — Version 2.0</p>

      {/* Table des matières */}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white mb-3">Table des matières</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{section.title}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">

        {/* 1. Définitions */}
        <section id="definitions">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-400" />
            1. Définitions
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2 text-zinc-300">
            <p><strong className="text-white">« Plateforme »</strong> : le site web CinéMax, l&apos;application mobile associée, et l&apos;ensemble des services y compris l&apos;administration.</p>
            <p><strong className="text-white">« Utilisateur »</strong> : toute personne physique accédant à la Plateforme, qu&apos;elle soit inscrite ou non.</p>
            <p><strong className="text-white">« Compte »</strong> : l&apos;espace personnel créé par l&apos;utilisateur lors de l&apos;inscription, lui permettant d&apos;accéder aux fonctionnalités réservées.</p>
            <p><strong className="text-white">« Contenu »</strong> : l&apos;ensemble des films, séries, animés, affiches, bandes-annonces, synopsis et métadonnées disponibles sur la Plateforme.</p>
            <p><strong className="text-white">« Pass Premium »</strong> : l&apos;abonnement payant donnant accès aux contenus exclusifs et aux fonctionnalités étendues.</p>
            <p><strong className="text-white">« Freemium »</strong> : le modèle d&apos;accès gratuit partiel au catalogue, avec publicités ou limitations.</p>
          </div>
        </section>

        {/* 2. Objet du Service */}
        <section id="objet">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-violet-400" />
            2. Objet du Service
          </h2>
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
          <p className="mt-2">
            <strong className="text-white">Portée du service</strong> : CinéMax diffuse des films, séries télévisées,
            documentaires et animés dans divers genres (action, romance, comédie, horreur, fantastique, science-fiction,
            etc.). Le catalogue est régulièrement mis à jour et peut varier selon les accords de distribution en vigueur.
          </p>
        </section>

        {/* 3. Accès au service & inscription */}
        <section id="acces">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-400" />
            3. Accès au service &amp; inscription
          </h2>
          <div className="space-y-3">
            <p>
              L&apos;accès au catalogue gratuit est ouvert à tout visiteur sans inscription. La création d&apos;un compte
              est nécessaire pour bénéficier des fonctionnalités suivantes :
            </p>
            <ul className="ml-4 list-disc space-y-1.5 text-zinc-300">
              <li>Reprise automatique de lecture (sauvegarde de la position toutes les 10 secondes).</li>
              <li>Gestion des favoris et de la liste de souhaits.</li>
              <li>Accès à l&apos;historique de visionnage personnalisé.</li>
              <li>Accès aux contenus exclusifs réservés aux abonnés Premium.</li>
              <li>Partage de liens vers des œuvres du catalogue.</li>
              <li>Recevoir des notifications sur les nouveautés et mises à jour.</li>
            </ul>
            <p>
              Vous devez fournir des informations exactes et complètes lors de l&apos;inscription, avoir l&apos;âge
              minimum requis par la loi de votre pays, et être responsable de la confidentialité de vos identifiants.
              CinéMax décline toute responsabilité en cas de perte ou de vol de mot de passe.
            </p>
            <p>
              <strong className="text-white">Suspension du compte</strong> : CinéMax se réserve le droit de suspendre ou
              de supprimer tout compte en cas de violation des présentes CGU, de comportement abusif, ou d&apos;usage
              frauduleux du service, sans préavis ni indemnisation.
            </p>
          </div>
        </section>

        {/* 4. Propriété intellectuelle */}
        <section id="propriete">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Copyright className="h-5 w-5 text-violet-400" />
            4. Respect des droits de propriété intellectuelle
          </h2>
          <p>
            Toutes les vidéos diffusées sur CinéMax font l&apos;objet de licences d&apos;exploitation valides ou relèvent
            de licences libres / du domaine public vérifiées par l&apos;équipe éditoriale.
          </p>
          <p className="mt-2">
            <strong className="text-white">Interdictions</strong> : Toute reproduction, redistribution, extraction,
            téléchargement, diffusion publique, retransmission, archivement ou exploitation commerciale non autorisée des
            contenus est strictement prohibée. Cela inclut, de manière non exhaustive :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Le téléchargement ou l&apos;enregistrement de flux vidéo.</li>
            <li>Le partage de comptes entre plusieurs utilisateurs non autorisés.</li>
            <li>L&apos;utilisation de scripts, bots ou outils automatisés pour extraire des données.</li>
            <li>La revente ou la sous-location d&apos;accès au service.</li>
            <li>Le contournement des mesures techniques de protection (DRM, restrictions géographiques).</li>
          </ul>
          <p className="mt-2">
            Tout manquement est susceptible d&apos;engager votre responsabilité civile et pénale conformément à la
            législation en vigueur.
          </p>
        </section>

        {/* 5. Procédure de retrait */}
        <section id="retrait" className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
          <h2 className="text-lg font-bold text-violet-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            5. Procédure de retrait des contenus &amp; réponse aux incidents
          </h2>
          <p className="text-zinc-300">
            Si vous êtes titulaire de droits d&apos;auteur ou représentant légal et estimez qu&apos;un contenu diffusé
            sur CinéMax porte atteinte à vos prérogatives, veuillez suivre la procédure suivante :
          </p>
          <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-zinc-300">
            <li><strong className="text-white">Signalement</strong> : Adressez un avis complet à <strong>droits@cinemax.local</strong> en précisant le titre de l&apos;œuvre, l&apos;URL exacte du contenu, la nature de votre droit, et toute preuve de titularité.</li>
            <li><strong className="text-white">Accusé de réception</strong> : Vous recevrez un accusé de réception sous 24 heures ouvrées confirmant la prise en compte de votre signalement.</li>
            <li><strong className="text-white">Mesure conservatoire</strong> : Désactivation immédiate du contenu contesté sous 48 heures maximum, à titre conservatoire, durant l&apos;instruction du litige.</li>
            <li><strong className="text-white">Instruction</strong> : L&apos;équipe juridique examinera votre demande et vous informera de la décision dans un délai de 15 jours ouvrées.</li>
            <li><strong className="text-white">Retrait définitif</strong> : Suppression du contenu et purge des flux CDN en cas de confirmation de contestation légitime.</li>
          </ol>
          <p className="mt-3 text-xs text-zinc-400">
            En cas de signalement abusif ou de fausse déclaration, CinéMax se réserve le droit de poursuivre
            l&apos;auteur du signalement pour dommages et préjudices subis.
          </p>
        </section>

        {/* 6. Abonnement */}
        <section id="abonnement">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            6. Abonnement, résiliation &amp; remboursement
          </h2>
          <div className="space-y-3">
            <p>
              L&apos;abonnement au Pass Premium est <strong className="text-white">sans engagement de durée minimale</strong>.
              Vous pouvez interrompre le renouvellement automatique à tout moment, sans frais supplémentaires, depuis la
              page Mon Compte ou en contactant le support.
            </p>
            <p>
              <strong className="text-white">Formules disponibles</strong> :
            </p>
            <ul className="ml-4 list-disc space-y-1.5 text-zinc-300">
              <li><strong>Mensuel</strong> : 1 500 FCFA / mois, renouvellement automatique.</li>
              <li><strong>Annuel</strong> : 15 000 FCFA / an (économie de ~17 %), renouvellement automatique.</li>
            </ul>
            <p>
              <strong className="text-white">Moyens de paiement</strong> : Les paiements sont traités par le prestataire
              PayDunya, acceptant Wave, Orange Money et les cartes bancaires. CinéMax ne stocke aucune donnée bancaire.
            </p>
            <p>
              <strong className="text-white">Résiliation</strong> : L&apos;abonnement donne accès aux contenus exclusifs
              jusqu&apos;à la fin de la période payée. Sauf obligation légale contraire ou droit de rétractation applicable,
              les sommes versées pour une période entamée ne sont pas remboursables au prorata.
            </p>
            <p>
              <strong className="text-white">Période d&apos;essai</strong> : Si une période d&apos;essai gratuit est
              proposée, elle est limitée dans le temps et ne se renouvelle pas automatiquement en abonnement payant sans
              votre consentement explicite.
            </p>
          </div>
        </section>

        {/* 7. Contenu utilisateur */}
        <section id="contenu-utilisateur">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-400" />
            7. Contenu généré par l&apos;utilisateur
          </h2>
          <p>
            Certaines fonctionnalités de la Plateforme peuvent permettre aux utilisateurs de générer du contenu
            (commentaires, listes personnalisées, partages). En publiant du contenu, vous déclarez et garants que :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Le contenu ne porte pas atteinte aux droits de tiers (droit d&apos;auteur, droit à l&apos;image, vie privée).</li>
            <li>Le contenu n&apos;est pas illicite, diffamatoire, diffamatoire, haineux, ou contraire aux bonnes mœurs.</li>
            <li>Vous détenez les droits nécessaires pour publier le contenu sur la Plateforme.</li>
          </ul>
          <p className="mt-2">
            CinéMax se réserve le droit de modérer, de retirer ou de refuser tout contenu utilisateur sans préavis,
            et de sanctionner les comptes en cas de violation répétée.
          </p>
        </section>

        {/* 8. Comportement des utilisateurs */}
        <section id="comportement">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-400" />
            8. Comportement des utilisateurs
          </h2>
          <p>
            Vous vous engagez à utiliser la Plateforme de manière responsable et à respecter les présentes CGU.
            Il vous est strictement interdit de :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Contourner les mesures de protection technique des contenus (DRM, restrictions d&apos;accès).</li>
            <li>Tenter d&apos;accéder sans autorisation aux espaces réservés (administration, API internes).</li>
            <li>Perturber le fonctionnement normal du service (attaques DDoS, extraction automatisée, surcharge des serveurs).</li>
            <li>Usurper l&apos;identité d&apos;un tiers ou se faire passer pour un représentant de CinéMax.</li>
            <li>Installer ou diffuser des logiciels malveillants via la Plateforme.</li>
            <li>Partager votre compte avec des tiers non autorisés au-delà des limites définies par votre abonnement.</li>
          </ul>
          <p className="mt-2">
            Tout manquement peut entraîner la suspension immédiate ou la suppression définitive de votre compte,
            sans préavis ni indemnisation, ainsi que des poursuites judiciaires si nécessaire.
          </p>
        </section>

        {/* 9. Responsabilité & disponibilité */}
        <section id="responsabilite">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Server className="h-5 w-5 text-violet-400" />
            9. Responsabilité &amp; disponibilité du service
          </h2>
          <p>
            CinéMax met en œuvre tous les moyens raisonnables pour assurer la disponibilité, la qualité et la sécurité
            du service, sans toutefois garantir une disponibilité ininterrompue ou exempte de tout défaut.
          </p>
          <p>
            <strong className="text-white">Limitation de responsabilité</strong> : CinéMax ne saurait être tenue responsable :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Des interruptions temporaires de service liées à la maintenance planifiée ou non planifiée.</li>
            <li>Des dommages directs ou indirects résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service, y compris la perte de données, de profits, ou d&apos;opportunités.</li>
            <li>Des contenus ou informations fournis par des tiers et accessibles via des liens hypertextes externes.</li>
            <li>De la qualité de connexion internet de l&apos;utilisateur, qui peut affecter l&apos;expérience de lecture (débit insuffisant, latence, buffering).</li>
            <li>Des incompatibilités techniques avec certains navigateurs, appareils ou systèmes d&apos;exploitation.</li>
          </ul>
          <p>
            <strong className="text-white">Force majeure</strong> : CinéMax ne sera pas tenue responsable de tout retard
            ou défaut d&apos;exécution de ses obligations en cas de force majeure, incluant mais sans s&apos;y limiter :
            pannes de réseau, catastrophes naturelles, actes de terrorisme, guerres, épidémies, mesures gouvernementales,
            ou toute autre situation indépendante de sa volonté et imprévisible.
          </p>
        </section>

        {/* 10. Modification & droit applicable */}
        <section id="modification">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-violet-400" />
            10. Modification des CGU &amp; droit applicable
          </h2>
          <p>
            CinéMax se réserve le droit de faire évoluer les présentes CGU à tout moment pour refléter les changements
            du service, de la réglementation, ou des pratiques du secteur. La version applicable est celle publiée sur
            cette page à la date de votre consultation.
          </p>
          <p className="mt-2">
            <strong className="text-white">Notification</strong> : En cas de modification substantielle, nous informerons
            les utilisateurs par e-mail ou par notification sur la Plateforme au moins 15 jours avant l&apos;entrée en
            vigueur des nouvelles conditions.
          </p>
          <p className="mt-2">
            <strong className="text-white">Droit applicable</strong> : Les présentes CGU sont soumises au droit applicable
            dans le pays d&apos;établissement de l&apos;éditeur. En cas de litige, les parties s&apos;engagent à rechercher
            en premier lieu une solution amiable.
          </p>
          <p className="mt-2">
            <strong className="text-white">Médiation</strong> : À défaut de résolution amiable dans un délai de 60 jours,
            l&apos;utilisateur peut recourir gratuitement à un médiateur de la consommation avant toute action en justice.
            Les tribunaux compétents seront ceux du ressort de l&apos;éditeur.
          </p>
          <p className="mt-4 text-xs text-zinc-400">
            Pour toute question relative à ces conditions, contactez-nous à{" "}
            <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>.
          </p>
        </section>

        {/* 11. Protection des mineurs */}
        <section id="mineurs">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Baby className="h-5 w-5 text-violet-400" />
            11. Protection des mineurs
          </h2>
          <div className="space-y-3">
            <p>
              CinéMax s&apos;engage à protéger les mineurs et à leur offrir un environnement de navigation sûr et adapté.
              Certaines œuvres disponibles sur la plateforme sont classées avec des avertissements de contenu et ne sont
              pas destinées aux enfants.
            </p>
            <p>
              <strong className="text-white">Classification par âge</strong> : Les œuvres sont classées selon des
              recommandations d&apos;âge (Tous publics, 10+, 12+, 16+, Interdit aux moins de 18 ans). Ces classifications
              sont indicatives et visent à guider les parents dans leur rôle éducatif.
            </p>
            <p>
              <strong className="text-white">Contrôle parental</strong> : Nous encourageons les parents à utiliser les
              fonctionnalités de contrôle parental disponibles sur leurs appareils et navigateurs pour superviser l&apos;accès
              des mineurs à notre plateforme.
            </p>
            <p>
              <strong className="text-white">Inscription des mineurs</strong> : La création d&apos;un compte par un mineur
              de moins de 13 ans nécessite le consentement explicite d&apos;un parent ou d&apos;un tuteur légal.
            </p>
          </div>
        </section>

        {/* 12. Accessibilité */}
        <section id="accessibilite">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-violet-400" />
            12. Accessibilité
          </h2>
          <div className="space-y-3">
            <p>
              CinéMax s&apos;engage à rendre son service accessible à toutes les personnes, y compris celles en situation
              de handicap, conformément aux bonnes pratiques d&apos;accessibilité numérique.
            </p>
            <p>
              <strong className="text-white">Mesures en place</strong> :
            </p>
            <ul className="ml-4 list-disc space-y-1.5 text-zinc-300">
              <li>Navigation au clavier pour les utilisateurs ne pouvant pas utiliser de souris.</li>
              <li>Contraste des couleurs conforme aux standards WCAG 2.1 niveau AA.</li>
              <li>Sous-titres disponibles pour certaines œuvres du catalogue.</li>
              <li>Descriptions audio pour les utilisateurs malvoyants (en cours de déploiement).</li>
              <li>Structure sémantique du code HTML pour les lecteurs d&apos;écran.</li>
            </ul>
            <p className="text-xs text-zinc-400">
              Si vous rencontrez un obstacle d&apos;accessibilité, contactez-nous à{" "}
              <a href="mailto:accessibilite@cinemax.local" className="text-amber-400 hover:text-amber-300">accessibilite@cinemax.local</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

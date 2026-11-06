import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Server, Copyright, Eye, AlertTriangle, Gavel, RefreshCw, Users, Accessibility, Baby } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions Légales",
  description: "Informations légales, hébergement, propriété intellectuelle et cadre juridique de la plateforme CinéMax.",
};

const sections = [
  { id: "editeur", title: "Éditeur de la plateforme", icon: Users },
  { id: "hebergement", title: "Hébergement", icon: Server },
  { id: "propriete", title: "Propriété intellectuelle", icon: Copyright },
  { id: "donnees", title: "Données personnelles", icon: Eye },
  { id: "signalement", title: "Signalement de contenu", icon: AlertTriangle },
  { id: "responsabilite", title: "Limitation de responsabilité", icon: Shield },
  { id: "droit", title: "Droit applicable & médiation", icon: Gavel },
  { id: "modification", title: "Modification des mentions", icon: RefreshCw },
  { id: "mineurs", title: "Protection des mineurs", icon: Baby },
  { id: "accessibilite", title: "Accessibilité", icon: Accessibility },
];

export default function MentionsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Mentions Légales</h1>
      <p className="mt-2 text-xs text-zinc-400">Édition d&apos;Octobre 2026 — Conformément aux obligations légales en vigueur</p>

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

        {/* 1. Éditeur */}
        <section id="editeur">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-400" />
            1. Éditeur de la plateforme
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <p>
              <strong className="text-white">Nom du service</strong> : CinéMax — Plateforme de diffusion vidéo à la demande (SVOD / streaming légal).
            </p>
            <p>
              <strong className="text-white">Siège social</strong> : Afrique de l&apos;Ouest.
            </p>
            <p>
              <strong className="text-white">Responsable de la publication</strong> : Équipe Technique &amp; Éditoriale CinéMax.
            </p>
            <p>
              <strong className="text-white">Directeur de la publication</strong> : Le représentant légal de la structure éditrice.
            </p>
            <p>
              <strong className="text-white">Contact éditorial et réclamations</strong> :{" "}
              <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>
            </p>
            <p className="text-xs text-zinc-400">
              CinéMax est un service indépendant. Il n&apos;est affilié à aucun studio, réseau de télévision ou
              fournisseur de catalogue tiers, sauf mention contraire explicite sur les fiches d&apos;œuvres concernées.
            </p>
          </div>
        </section>

        {/* 2. Hébergement */}
        <section id="hebergement">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Server className="h-5 w-5 text-violet-400" />
            2. Hébergement de l&apos;application &amp; des vidéos
          </h2>
          <div className="space-y-3">
            <p>
              <strong className="text-white">Application Web &amp; base de données</strong> : hébergées sur une infrastructure
              cloud sécurisée. Les données applicatives sont stockées sur une base de données PostgreSQL gérée, avec
              sauvegardes régulières et chiffrement au repos.
            </p>
            <p>
              <strong className="text-white">Diffusion vidéo</strong> : les vidéos sont lues depuis des URL directes
              (fichiers MP4/WebM ou playlists HLS) renseignées par l&apos;éditeur auprès de son hébergeur vidéo dédié.
              La diffusion s&apos;effectue via un réseau de distribution de contenu (CDN) pour optimiser la qualité de lecture.
            </p>
            <p>
              <strong className="text-white">Application mobile</strong> : l&apos;application Android (APK) est distribuée
              directement par CinéMax via un lien de téléchargement sécurisé disponible sur le site.
            </p>
            <p className="text-xs text-zinc-400">
              Les coordonnées complètes de chaque hébergeur, ainsi que ses conditions propres, sont disponibles sur
              demande écrite adressée à l&apos;éditeur à <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>.
            </p>
          </div>
        </section>

        {/* 3. Propriété intellectuelle */}
        <section id="propriete">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Copyright className="h-5 w-5 text-violet-400" />
            3. Propriété intellectuelle
          </h2>
          <div className="space-y-3">
            <p>
              L&apos;ensemble des éléments composant le site — structure, code source, charte graphique, logos,
              interfaces utilisateur, textes éditoriaux et contenus originaux — est protégé par le droit de la propriété
              intellectuelle et appartient exclusivement à CinéMax ou à ses concédants.
            </p>
            <p>
              <strong className="text-white">Œuvres tierces</strong> : Les affiches, bandes-annonces, synopsis, photos de
              casting, titres et marques cités demeurent la propriété exclusive de leurs ayants droit respectifs (studios,
              producteurs, distributeurs). Ils sont utilisés dans le cadre de licences d&apos;exploitation valides,
              d&apos;accords de distribution ou de limites légales (citation, accès libre). Leur présence sur CinéMax ne
              vaut en aucun cas transfert de propriété ni approbation de la part des ayants droit.
            </p>
            <p>
              <strong className="text-white">Interdictions</strong> : Toute reproduction, représentation, modification,
              adaptation, traduction, distribution ou exploitation non autorisée de tout ou partie du site, y compris par
              le biais de scripts automatisés (web scraping, bots, crawlers), est strictement interdite et susceptible de
              constituer une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété
              intellectuelle ainsi que par les textes équivalents applicables.
            </p>
            <p>
              <strong className="text-white">Marques</strong> : La marque « CinéMax » et tous les logos associés sont
              déposés ou en cours de dépôt. Toute utilisation non autorisée de ces signes distinctifs est interdite.
            </p>
          </div>
        </section>

        {/* 4. Données personnelles */}
        <section id="donnees">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-violet-400" />
            4. Données personnelles &amp; cookies
          </h2>
          <p>
            Le traitement des données à caractère personnel, les finalités, les bases légales, les durées de conservation
            et l&apos;usage des cookies sont décrits en détail dans notre{" "}
            <Link href="/confidentialite" className="text-amber-400 hover:text-amber-300">
              Politique de Confidentialité
            </Link>
            .
          </p>
          <p className="mt-2">
            Pour exercer vos droits (accès, rectification, effacement, limitation, opposition, portabilité), écrivez à{" "}
            <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>.
            Nous nous engageons à vous répondre dans un délai de 30 jours maximum.
          </p>
        </section>

        {/* 5. Signalement de contenu */}
        <section id="signalement">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-violet-400" />
            5. Signalement d&apos;un contenu &amp; droit d&apos;auteur
          </h2>
          <p>
            Toute personne titulaire de droits d&apos;auteur ou représentant légal estimant qu&apos;un contenu diffusé sur
            CinéMax porte atteinte à ses prérogatives peut saisir l&apos;éditeur via la procédure de notification et de
            retrait décrite à l&apos;article 4 de nos{" "}
            <Link href="/conditions" className="text-amber-400 hover:text-amber-300">
              Conditions Générales d&apos;Utilisation
            </Link>
            .
          </p>
          <p className="mt-2">
            <strong className="text-white">Contact dédié aux droits</strong> :{" "}
            <a href="mailto:droits@cinemax.local" className="text-amber-400 hover:text-amber-300">droits@cinemax.local</a>
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            CinéMax s&apos;engage à traiter tout signalement légitime dans un délai de 48 heures ouvrées et à prendre les
            mesures conservatoires appropriées, y compris la désactivation immédiate du contenu contesté.
          </p>
        </section>

        {/* 6. Limitation de responsabilité */}
        <section id="responsabilite">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-400" />
            6. Limitation de responsabilité
          </h2>
          <p>
            CinéMax met en œuvre tous les moyens raisonnables pour assurer la qualité, l&apos;exactitude et la disponibilité
            du service. Toutefois, la plateforme ne saurait être tenue responsable :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Des interruptions temporaires de service liées à la maintenance planifiée ou à un cas de force majeure.</li>
            <li>Des dommages directs ou indirects résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service.</li>
            <li>Des contenus ou informations fournis par des tiers et accessibles via des liens hypertextes externes.</li>
            <li>De la qualité de connexion internet de l&apos;utilisateur, qui peut affecter l&apos;expérience de lecture.</li>
          </ul>
        </section>

        {/* 7. Droit applicable et médiation */}
        <section id="droit">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-violet-400" />
            7. Droit applicable &amp; médiation
          </h2>
          <p>
            Les présentes mentions légales sont soumises au droit applicable dans le pays d&apos;établissement de l&apos;éditeur.
            En cas de litige, les parties s&apos;engagent à rechercher en premier lieu une solution amiable.
          </p>
          <p className="mt-2">
            À défaut de résolution amiable dans un délai de 60 jours, le litige sera soumis à la compétence exclusive des
            tribunaux du ressort de l&apos;éditeur.
          </p>
          <p className="mt-2">
            <strong className="text-white">Médiation</strong> : Avant toute action en justice, l&apos;utilisateur peut
            recourir gratuitement à un médiateur de la consommation. Le formulaire européen de résolution en ligne des
            litiges (RLL) est accessible sur le site de la Commission européenne.
          </p>
        </section>

        {/* 8. Modification des mentions */}
        <section id="modification">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-violet-400" />
            8. Modification des mentions légales
          </h2>
          <p>
            CinéMax se réserve le droit de modifier les présentes mentions légales à tout moment pour refléter les
            évolutions du service, de la réglementation ou de l&apos;organisation de l&apos;éditeur. La version applicable
            est celle publiée sur cette page à la date de votre consultation. Nous vous invitons à consulter régulièrement
            cette page pour prendre connaissance des éventuelles mises à jour.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Pour toute question relative à ces mentions légales, contactez-nous à{" "}
            <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>.
          </p>
        </section>

        {/* 9. Protection des mineurs */}
        <section id="mineurs">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Baby className="h-5 w-5 text-violet-400" />
            9. Protection des mineurs
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
              de moins de 13 ans nécessite le consentement explicite d&apos;un parent ou d&apos;un tuteur légal. En cas de
              doute sur l&apos;âge de l&apos;utilisateur, nous nous réservons le droit de demander une preuve d&apos;identité
              ou de consentement parental.
            </p>
            <p className="text-xs text-zinc-400">
              Si vous estimez qu&apos;un contenu inapproprié est accessible aux mineurs, signalez-le à{" "}
              <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>.
            </p>
          </div>
        </section>

        {/* 10. Accessibilité */}
        <section id="accessibilite">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-violet-400" />
            10. Accessibilité
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
            <p>
              <strong className="text-white">Amélioration continue</strong> : Nous travaillons continuellement à améliorer
              l&apos;accessibilité de notre plateforme. Si vous rencontrez un obstacle ou avez des suggestions, contactez-nous
              à <a href="mailto:accessibilite@cinemax.local" className="text-amber-400 hover:text-amber-300">accessibilite@cinemax.local</a>.
            </p>
            <p className="text-xs text-zinc-400">
              Conformément à la réglementation en vigueur, nous nous engageons à atteindre un niveau d&apos;accessibilité
              conforme aux références du Référentiel Général d&apos;Amélioration de l&apos;Accessibilité (RGAA).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

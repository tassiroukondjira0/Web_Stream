import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck, Database, Target, Share2, Globe, Shield, Clock, Cookie, Scale, RefreshCw, Baby, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Engagement de CinéMax sur la protection de la vie privée, le traitement des données personnelles, les cookies et vos droits conformément au RGPD.",
};

const sections = [
  { id: "responsable", title: "Responsable du traitement", icon: UserCheck },
  { id: "donnees-collectees", title: "Données collectées", icon: Database },
  { id: "finalites", title: "Finalités & base légale", icon: Target },
  { id: "partage", title: "Partage des données", icon: Share2 },
  { id: "transferts", title: "Transferts internationaux", icon: Globe },
  { id: "securite", title: "Sécurité des données", icon: Shield },
  { id: "conservation", title: "Durée de conservation", icon: Clock },
  { id: "cookies", title: "Cookies & traceurs", icon: Cookie },
  { id: "droits", title: "Vos droits RGPD", icon: Scale },
  { id: "modification", title: "Modification", icon: RefreshCw },
  { id: "mineurs", title: "Protection des mineurs", icon: Baby },
  { id: "accessibilite", title: "Accessibilité", icon: Eye },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Politique de Confidentialité</h1>
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

        {/* 1. Responsable du traitement */}
        <section id="responsable">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-violet-400" />
            1. Responsable du traitement
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <p>
              <strong className="text-white">Responsable</strong> : CinéMax — Plateforme de diffusion vidéo à la demande.
            </p>
            <p>
              <strong className="text-white">Contact DPO</strong> :{" "}
              <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>
            </p>
            <p>
              <strong className="text-white">Contact général</strong> :{" "}
              <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>
            </p>
            <p className="text-zinc-300">
              La présente politique décrit quelles données personnelles nous collectons, pourquoi nous les traitons,
              comment nous les protégeons, avec qui nous les partageons, et quels sont vos droits. Elle s&apos;applique
              à l&apos;ensemble des services CinéMax, incluant le site web et l&apos;application mobile.
            </p>
          </div>
        </section>

        {/* 2. Données collectées */}
        <section id="donnees-collectees">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-400" />
            2. Données collectées
          </h2>
          <p>
            Nous appliquons le principe de minimisation et ne collectons que les données strictement nécessaires au
            fonctionnement du service :
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p><strong className="text-white">Données de compte</strong> : adresse e-mail et mot de passe (haché via Bcrypt) pour
              l&apos;authentification, ainsi qu&apos;un nom d&apos;affichage facultatif.</p>
            </div>
            <div>
              <p><strong className="text-white">Données d&apos;usage</strong> : historique de visionnage, progression de
              lecture (position sauvegardée toutes les 10 secondes), et durée de session, pour vous permettre de reprendre
              une vidéo là où vous l&apos;avez laissée et personnaliser votre expérience.</p>
            </div>
            <div>
              <p><strong className="text-white">Préférences</strong> : favoris, liste de souhaits, langue d&apos;interface,
              et paramètres de notification.</p>
            </div>
            <div>
              <p><strong className="text-white">Données techniques anonymes</strong> : pages vues (chemin et horodatage),
              type de navigateur, système d&apos;exploitation, et résolution d&apos;écran pour les statistiques de
              fréquentation. Ces données ne contiennent aucune information personnelle identifiante.</p>
            </div>
            <div>
              <p><strong className="text-white">Données de paiement</strong> : nous ne collectons <strong className="text-white">aucune donnée bancaire</strong>.
              Les paiements sont traités intégralement par notre prestataire PayDunya ; nous ne conservons que
              l&apos;identifiant de transaction, le statut et le montant, jamais vos coordonnées de carte ou de compte mobile money.</p>
            </div>
          </div>
        </section>

        {/* 3. Finalités & base légale */}
        <section id="finalites">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-400" />
            3. Finalités &amp; base légale du traitement
          </h2>
          <p>Vos données sont traitées pour des finalités déterminées, explicites et légitimes :</p>
          <div className="mt-3 space-y-2">
            <p>
              <strong className="text-white">Création et sécurisation du compte</strong> — Base légale : exécution du contrat.
              Votre adresse e-mail et mot de passe haché sont nécessaires pour créer et protéger votre compte.
            </p>
            <p>
              <strong className="text-white">Fourniture du service de streaming</strong> — Base légale : exécution du contrat.
              L&apos;historique de lecture et la progression sont essentiels pour la reprise automatique et le fonctionnement du lecteur.
            </p>
            <p>
              <strong className="text-white">Gestion de l&apos;abonnement Premium</strong> — Base légale : exécution du contrat.
              Les données de transaction sont nécessaires pour activer et renouveler votre abonnement.
            </p>
            <p>
              <strong className="text-white">Newsletter et communications</strong> — Base légale : consentement explicite.
              Nous envoyons des e-mails informatifs uniquement si vous y avez consenti. Vous pouvez vous désinscrire à tout moment.
            </p>
            <p>
              <strong className="text-white">Statistiques et amélioration du service</strong> — Base légale : intérêt légitime.
              Les données anonymes de fréquentation nous aident à comprendre l&apos;usage du service et à l&apos;améliorer.
            </p>
            <p>
              <strong className="text-white">Obligations légales</strong> — Base légale : obligation légale.
              Conservation des données de facturation et gestion des signalements de contenu conformément à la réglementation.
            </p>
          </div>
        </section>

        {/* 4. Absence de revente */}
        <section id="partage">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-violet-400" />
            4. Absence de revente &amp; partage des données
          </h2>
          <p>
            Vos données personnelles ne sont <strong className="text-white">ni vendues, ni louées, ni cédées</strong> à des
            tiers à des fins commerciales, publicitaires ou de profilage comportemental.
          </p>
          <p className="mt-2">
            Elles ne sont partagées qu&apos;avec nos sous-traitants techniques strictement nécessaires au fonctionnement
            du service, dans le cadre de contrats de traitement de données imposant des obligations de confidentialité
            et de sécurité :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li><strong>Hébergement cloud</strong> : infrastructure serveur et base de données PostgreSQL.</li>
            <li><strong>Diffusion vidéo</strong> : hébergeur vidéo et réseau de distribution de contenu (CDN).</li>
            <li><strong>Paiement</strong> : prestataire PayDunya (Wave, Orange Money, cartes bancaires).</li>
            <li><strong>Communication</strong> : service d&apos;envoi d&apos;e-mails transactionnels et de newsletter.</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-400">
            Aucun sous-traitant ne peut utiliser vos données à des fins autres que celles explicitement définies par CinéMax.
          </p>
        </section>

        {/* 5. Transferts internationaux */}
        <section id="transferts">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-violet-400" />
            5. Transferts internationaux de données
          </h2>
          <p>
            Certaines de nos infrastructures (hébergement, CDN) peuvent être hébergées dans des pays hors de votre
            juridiction. Dans ce cas, nous nous assurons que :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Le pays de destination offre un niveau de protection adéquat des données personnelles.</li>
            <li>Des clauses contractuelles types (SCC) sont mises en place avec les sous-traitants concernés.</li>
            <li>Les mesures techniques de chiffrement sont appliquées aux données en transit et au repos.</li>
          </ul>
        </section>

        {/* 6. Sécurité */}
        <section id="securite">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-400" />
            6. Sécurité des données
          </h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données
            personnelles contre tout accès non autorisé, modification, divulgation ou destruction :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li><strong>Chiffrement</strong> : tous les échanges sont chiffrés via HTTPS/TLS. Les mots de passe sont hachés avec l&apos;algorithme Bcrypt avant stockage.</li>
            <li><strong>Contrôle d&apos;accès</strong> : l&apos;accès aux données est limité au strict nécessaire selon le principe du moindre privilège.</li>
            <li><strong>Sauvegardes</strong> : des sauvegardes régulières et chiffrées sont effectuées pour garantir la disponibilité et l&apos;intégrité des données.</li>
            <li><strong>Authentification</strong> : les sessions utilisateur sont protégées par des jetons sécurisés (HTTP-only cookies).</li>
            <li><strong>Audits</strong> : les mesures de sécurité sont régulièrement révisées et améliorées.</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-400">
            Aucun membre de l&apos;équipe CinéMax ne peut accéder à votre mot de passe en clair. En cas de suspicion de
            fuite de données, nous nous engageons à vous informer et à notifier les autorités compétentes dans les délais
            légaux.
          </p>
        </section>

        {/* 7. Durée de conservation */}
        <section id="conservation">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-400" />
            7. Durée de conservation des données
          </h2>
          <p>Nous conservons vos données personnelles uniquement aussi longtemps que nécessaire :</p>
          <div className="mt-3 space-y-2">
            <p>
              <strong className="text-white">Données de compte</strong> : conservées pendant toute la durée de vie de votre
              compte, puis supprimées ou anonymisées dans un délai de 30 jours après sa fermeture définitive.
            </p>
            <p>
              <strong className="text-white">Historique de lecture et préférences</strong> : conservées tant que votre compte
              est actif. Supprimées lors de la suppression du compte.
            </p>
            <p>
              <strong className="text-white">Données de facturation</strong> : conservées conformément aux obligations
              comptables et fiscales applicables (généralement 10 ans).
            </p>
            <p>
              <strong className="text-white">Données techniques anonymes</strong> : conservées pour une durée maximale de
              12 mois à des fins statistiques, puis anonymisées de manière irréversible.
            </p>
            <p>
              <strong className="text-white">Logs de connexion</strong> : conservés pendant 6 mois maximum pour la détection
              et la prévention des accès frauduleux.
            </p>
          </div>
        </section>

        {/* 8. Cookies */}
        <section id="cookies">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Cookie className="h-5 w-5 text-violet-400" />
            8. Cookies &amp; traceurs
          </h2>
          <p>Nous utilisons des cookies et technologies similaires à des fins strictement limitées :</p>
          <div className="mt-3 space-y-2">
            <p>
              <strong className="text-white">Cookies essentiels</strong> : session d&apos;authentification, préférences
              d&apos;interface, et gestion du panier d&apos;abonnement. Ces cookies sont indispensables au fonctionnement
              du service et ne peuvent être désactivés.
            </p>
            <p>
              <strong className="text-white">Cookies analytiques</strong> : statistiques de fréquentation anonymes pour
              comprendre l&apos;usage du site et améliorer l&apos;expérience utilisateur.
            </p>
            <p>
              <strong className="text-white">Aucun cookie publicitaire</strong> : nous n&apos;utilisons pas de cookies
              publicitaires tiers, de pixels de suivi, ni de pistage à des fins de profilage commercial ou de publicité
              ciblée.
            </p>
          </div>
          <p className="mt-2">
            Vous pouvez à tout moment configurer votre navigateur pour refuser les cookies non essentiels ou les supprimer.
            Consultez l&apos;aide de votre navigateur pour connaître la procédure.
          </p>
        </section>

        {/* 9. Vos droits RGPD */}
        <section id="droits">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Scale className="h-5 w-5 text-violet-400" />
            9. Vos droits (RGPD et réglementations applicables)
          </h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et aux réglementations locales
            applicables, vous disposez des droits suivants :
          </p>
          <div className="mt-3 space-y-2">
            <p><strong className="text-white">Droit d&apos;accès</strong> : vous pouvez demander une copie de toutes les données personnelles que nous détenons à votre sujet.</p>
            <p><strong className="text-white">Droit de rectification</strong> : vous pouvez demander la correction de données inexactes ou incomplètes.</p>
            <p><strong className="text-white">Droit à l&apos;effacement</strong> : vous pouvez demander la suppression de vos données (« droit à l&apos;oubli »), sous réserve de nos obligations légales de conservation.</p>
            <p><strong className="text-white">Droit à la limitation</strong> : vous pouvez demander la suspension temporaire du traitement de vos données dans certains cas.</p>
            <p><strong className="text-white">Droit à la portabilité</strong> : vous pouvez recevoir vos données dans un format structuré, couramment utilisé et lisible par machine.</p>
            <p><strong className="text-white">Droit d&apos;opposition</strong> : vous pouvez vous opposer au traitement de vos données à des fins d&apos;intérêt légitime ou de marketing.</p>
            <p><strong className="text-white">Droit de retirer le consentement</strong> : si le traitement repose sur votre consentement, vous pouvez le retirer à tout moment sans affecter la licéité du traitement antérieur.</p>
          </div>
          <p className="mt-3">
            <strong className="text-white">Comment exercer vos droits</strong> :
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1.5 text-zinc-300">
            <li>Depuis la page <Link href="/mon-compte" className="text-amber-400 hover:text-amber-300">Mon Compte</Link> pour certaines actions (modification du profil, suppression du compte).</li>
            <li>Par e-mail à <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a> pour les demandes plus complexes.</li>
          </ul>
          <p className="mt-2">
            Nous nous engageons à traiter votre demande dans un délai de 30 jours maximum, et à vous fournir une réponse
            claire et motivée.
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de
            l&apos;autorité de protection des données compétente de votre pays de résidence.
          </p>
        </section>

        {/* 10. Modification de la politique */}
        <section id="modification">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-violet-400" />
            10. Modification de la politique de confidentialité
          </h2>
          <p>
            CinéMax se réserve le droit de modifier la présente politique de confidentialité à tout moment pour refléter
            les évolutions du service, de la réglementation, ou de nos pratiques de traitement des données.
          </p>
          <p className="mt-2">
            La version applicable est celle publiée sur cette page à la date de votre consultation. En cas de modification
            substantielle, nous informerons les utilisateurs par e-mail ou par notification sur la Plateforme.
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            Pour toute question relative à cette politique, contactez-nous à{" "}
            <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>.
          </p>
        </section>

        {/* 11. Protection des mineurs */}
        <section id="mineurs">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Baby className="h-5 w-5 text-violet-400" />
            11. Protection des données des mineurs
          </h2>
          <div className="space-y-3">
            <p>
              CinéMax s&apos;engage à protéger particulièrement les données personnelles des mineurs. Nous savons que
              les enfants et adolescents peuvent être plus vulnérables en matière de protection de leurs données.
            </p>
            <p>
              <strong className="text-white">Collecte des données des mineurs</strong> : Nous ne collectons pas
              sciemment les données personnelles de mineurs de moins de 13 ans sans le consentement d&apos;un parent
              ou d&apos;un tuteur légal. Si un parent ou tuteur estime que son enfant nous a fourni des données sans
              consentement, il peut nous contacter à{" "}
              <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>
              {" "}pour demander la suppression de ces données.
            </p>
            <p>
              <strong className="text-white">Mesures spécifiques</strong> : Pour les comptes de mineurs, nous appliquons
              des paramètres de confidentialité renforcés par défaut, limitant le partage de données et les communications
              marketing.
            </p>
          </div>
        </section>

        {/* 12. Accessibilité */}
        <section id="accessibilite">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-violet-400" />
            12. Accessibilité de la politique
          </h2>
          <div className="space-y-3">
            <p>
              Cette politique de confidentialité est rédigée dans un langage clair et accessible. Si vous avez des
              difficultés à comprendre certains termes ou sections, n&apos;hésitez pas à nous contacter.
            </p>
            <p>
              <strong className="text-white">Version simplifiée</strong> : Une version simplifiée de cette politique
              est disponible sur demande à{" "}
              <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>.
            </p>
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

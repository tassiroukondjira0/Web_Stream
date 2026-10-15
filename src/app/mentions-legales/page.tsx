import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Légales",
  description: "Informations légales et hébergement de la plateforme CinéMax.",
};

export default function MentionsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <h1 className="text-3xl font-extrabold text-white">Mentions Légales</h1>
      <p className="mt-2 text-xs text-zinc-400">Édition d&apos;Octobre 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Éditeur de la plateforme</h2>
          <p>
            <strong className="text-white">CinéMax</strong> — Plateforme de diffusion vidéo à la demande (SVOD / streaming légal).<br />
            Responsable de la publication : Équipe Technique &amp; Éditoriale CinéMax.<br />
            Contact éditorial et réclamations : <a href="mailto:contact@cinemax.local" className="text-amber-400 hover:text-amber-300">contact@cinemax.local</a>.<br />
            Directeur de la publication : le représentant légal de la structure éditrice.
          </p>
          <p className="mt-2">
            CinéMax est un service indépendant. Il n&apos;est affilié à aucun studio, réseau de télévision ou
            fournisseur de catalogue tiers, sauf mention contraire sur les fiches concernées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Hébergement de l&apos;application &amp; des vidéos</h2>
          <p>
            <strong className="text-white">Application Web &amp; base de données</strong> : hébergées sur une infrastructure
            cloud (Vercel et/ou Cloudflare). Les données applicatives sont stockées sur une base de données
            PostgreSQL gérée.
          </p>
          <p className="mt-2">
            <strong className="text-white">Diffusion vidéo (HLS / DASH) &amp; stockage média</strong> : Cloudflare Stream
            (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis). Cloudflare agit en qualité
            de sous-traitant technique pour le transport et la mise en cache des contenus vidéo.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Les coordonnées complètes de chaque hébergeur, ainsi que ses conditions propres, sont disponibles sur
            demande écrite adressée à l&apos;éditeur.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments composant le site — structure, code source, charte graphique, logos,
            interfaces et textes éditoriaux — est protégé par le droit de la propriété intellectuelle et appartient
            à CinéMax ou à ses concédants.
          </p>
          <p className="mt-2">
            Les affiches, bandes-annonces, titres et marques cités demeurent la propriété exclusive de leurs ayants
            droit respectifs et sont utilisés dans le cadre de licences d&apos;exploitation, d&apos;accords de
            distribution ou de limites légales (citation, accès libre). Leur présence sur CinéMax ne vaut en aucun
            cas transfert de propriété ni approbation de la part des ayants droit.
          </p>
          <p className="mt-2">
            Toute reproduction, représentation, modification ou exploitation non autorisée de tout ou partie du site
            est interdite et susceptible de constituer une contrefaçon sanctionnée par les articles L.335-2 et
            suivants du Code de la propriété intellectuelle.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Données personnelles &amp; cookies</h2>
          <p>
            Le traitement des données à caractère personnel et l&apos;usage des cookies sont décrits en détail dans
            notre{" "}
            <Link href="/confidentialite" className="text-amber-400 hover:text-amber-300">
              Politique de Confidentialité
            </Link>
            . Pour exercer vos droits (accès, rectification, effacement, opposition), écrivez à{" "}
            <a href="mailto:privacy@cinemax.local" className="text-amber-400 hover:text-amber-300">privacy@cinemax.local</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Signalement d&apos;un contenu &amp; contact</h2>
          <p>
            Toute personne estimant qu&apos;un contenu porte atteinte à ses droits ou aux présentes mentions peut
            saisir l&apos;éditeur. La procédure de notification et de retrait est décrite à l&apos;article 3 de nos{" "}
            <Link href="/conditions" className="text-amber-400 hover:text-amber-300">
              Conditions Générales d&apos;Utilisation
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

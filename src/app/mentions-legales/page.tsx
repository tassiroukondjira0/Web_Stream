import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions Légales",
  description: "Informations légales et hébergement de la plateforme StreamWeb.",
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
            StreamWeb — Plateforme de diffusion vidéo légale.<br />
            Responsable de la publication : Équipe Technique & Éditoriale StreamWeb.<br />
            Contact : contact@streamweb.local
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Hébergement de l&apos;application & Vidéos</h2>
          <p>
            Application Web : Déployée sur infrastructure Vercel / Cloudflare.<br />
            Diffusion Vidéo HLS & Stockage média : Cloudflare Stream (Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, USA).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble de la structure du site, code source et logos sont protégés par le droit de la propriété intellectuelle.
            Les marques, affiches et bandes-annonces citées demeurent la propriété exclusive de leurs ayants droit respectifs.
          </p>
        </section>
      </div>
    </div>
  );
}

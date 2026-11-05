import type { Metadata } from "next";
import { Mail, MapPin, Clock, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Nous contacter — CinéMax",
  description:
    "Une question, une suggestion ou un problème ? Contactez l'équipe CinéMax par e-mail ou via notre formulaire.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-zinc-300">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white">Nous contacter</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Notre équipe vous répond généralement sous 24 à 48 heures.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Informations de contact */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                <Mail className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">E-mail</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Pour toute question générale ou demande d&apos;information.
                </p>
                <a
                  href="mailto:contact@cinemax.local"
                  className="mt-1 inline-block text-sm font-medium text-purple-400 hover:text-purple-300"
                >
                  contact@cinemax.local
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/20">
                <MessageCircle className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Support technique</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Problèmes de lecture, de compte ou de paiement.
                </p>
                <a
                  href="mailto:support@cinemax.local"
                  className="mt-1 inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
                >
                  support@cinemax.local
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Horaires de réponse</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Du lundi au vendredi, 9h — 18h (GMT).
                  <br />
                  Week-ends et jours fériés : réponse sous 48h.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                <MapPin className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Siège</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  CinéMax est une plateforme en ligne.
                  <br />
                  Nous opérons depuis l&apos;Afrique de l&apos;Ouest.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de contact */}
        <div>
          <form
            action="mailto:contact@cinemax.local"
            method="POST"
            encType="text/plain"
            className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Envoyez-nous un message</h3>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
                Nom complet
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Adresse e-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-zinc-300">
                Sujet
              </label>
              <select
                id="subject"
                name="subject"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Sélectionnez un sujet</option>
                <option value="general">Question générale</option>
                <option value="account">Problème de compte</option>
                <option value="payment">Problème de paiement</option>
                <option value="player">Problème de lecture</option>
                <option value="premium">Abonnement Premium</option>
                <option value="suggestion">Suggestion</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-zinc-300">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Décrivez votre demande en détail…"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Envoyer le message
            </button>

            <p className="text-xs text-zinc-500 text-center">
              Ce formulaire ouvrira votre client e-mail par défaut.
              <br />
              Vous pouvez aussi nous écrire directement à{" "}
              <a href="mailto:contact@cinemax.local" className="text-purple-400 hover:text-purple-300">
                contact@cinemax.local
              </a>
              .
            </p>
          </form>
        </div>
      </div>

      {/* FAQ rapide */}
      <div className="mt-12 rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
        <h3 className="text-lg font-bold text-white">Questions fréquentes</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Vous trouvez peut-être la réponse rapidement sur notre page{" "}
          <a href="/aide" className="text-purple-400 hover:text-purple-300 font-medium">
            Aide & FAQ
          </a>
          , ou en discutant avec notre{" "}
          <a href="/aide#chat" className="text-purple-400 hover:text-purple-300 font-medium">
            assistant IA
          </a>
          .
        </p>
      </div>
    </div>
  );
}

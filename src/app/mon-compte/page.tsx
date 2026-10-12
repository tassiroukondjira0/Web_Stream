"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ShieldCheck, LogOut, Film, Clock, Bookmark, Sparkles, AlertCircle } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN";
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center text-sm text-zinc-400">
        Chargement de votre compte...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-zinc-400 mb-4">
          <User className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Non connecté</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Connectez-vous pour consulter votre abonnement, vos favoris et votre progression de lecture.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/connexion"
            className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-500"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="rounded-xl bg-zinc-800 border border-white/10 px-5 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    );
  }

  const isPremium = user.role === "SUBSCRIBER" || user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* En-tête profil */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 text-2xl font-black text-white shadow-xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              {isPremium ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  PREMIUM
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  Compte Gratuit
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>

      {/* Carte d'Abonnement Freemium */}
      <div className="mt-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Formule active
              </span>
              <h2 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
                {isPremium ? "Pass Premium Haute Définition" : "Formule Standard Gratuite"}
                {isPremium && <Sparkles className="h-5 w-5 text-amber-400" />}
              </h2>
              <p className="mt-2 text-sm text-zinc-400 max-w-xl">
                {isPremium
                  ? "Vous disposez d'un accès illimité à l'intégralité du catalogue, aux titres exclusifs et aux résolutions 4K sans interruption publicitaire."
                  : "Vous profitez des œuvres d'appel et du catalogue public libre de droits. Passez à la formule Premium pour débloquer les titres exclusifs."}
              </p>
            </div>

            <div>
              {!isPremium ? (
                <Link
                  href="/premium"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all hover:scale-105"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Activer le Pass Premium
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  Abonnement actif jusqu&apos;au 31/12/2026
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections Favoris & Reprise de lecture */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-red-500" />
              Ma Liste de Favoris
            </h3>
            <Link href="/films" className="text-xs text-zinc-400 hover:text-white">
              Explorer →
            </Link>
          </div>
          <p className="text-xs text-zinc-400">
            Retrouvez rapidement les films que vous avez enregistrés pour les visionner plus tard.
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
            Aucun film ajouté pour le moment. Cliquez sur « Ajouter à mes favoris » sur la fiche d&apos;un film.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Reprendre la lecture
            </h3>
            <span className="text-xs text-zinc-500">Synchronisé</span>
          </div>
          <p className="text-xs text-zinc-400">
            Votre position de lecture est sauvegardée automatiquement toutes les 10 secondes.
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
            Aucune session en cours. Lancez un film depuis le catalogue pour démarrer la lecture.
          </div>
        </div>
      </div>
    </div>
  );
}

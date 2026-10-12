"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Identifiants invalides.");
        setLoading(false);
        return;
      }

      router.push("/mon-compte");
      router.refresh();
    } catch {
      setError("Une erreur réseau est survenue.");
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 font-black text-white shadow-lg shadow-red-600/30">
            C
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Connexion</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Accédez à vos favoris, votre historique et vos contenus exclusifs
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300">Adresse e-mail</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300">Mot de passe</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Boutons d'accès rapide pour tests */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-center text-xs font-semibold text-zinc-400 mb-3">
            🧪 Comptes de démonstration pour tester :
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("abonne@streamweb.local")}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 px-2 text-amber-300 hover:bg-amber-500/20"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Pass Premium
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@streamweb.local")}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 py-2 px-2 text-purple-300 hover:bg-purple-500/20"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Administrateur
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-red-400 hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

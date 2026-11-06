"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, KeyRound, RefreshCw, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // État pour le flux de vérification email
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResending, setVerifyResending] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailUnverified(false);
    setVerifyError("");
    setVerifyCode("");
    setVerifySuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Email non vérifié — afficher le formulaire de vérification
        if (res.status === 403 && data.emailVerified === false) {
          setEmailUnverified(true);
          setLoading(false);
          return;
        }
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

  // Renvoyer un nouveau code de vérification
  const handleResendCode = async () => {
    setVerifyError("");
    setVerifyResending(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Impossible d'envoyer le code.");
      } else {
        setVerifyError("");
      }
    } catch {
      setVerifyError("Une erreur réseau est survenue.");
    } finally {
      setVerifyResending(false);
    }
  };

  // Vérifier le code saisi
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Code incorrect.");
        setVerifyLoading(false);
        return;
      }

      // Email vérifié — se connecter automatiquement
      setVerifySuccess(true);
      setVerifyLoading(false);

      // Re-tenter la connexion après vérification
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        router.push("/mon-compte");
        router.refresh();
      } else {
        // Si la connexion automatique échoue, rester sur le succès de vérification
        setVerifySuccess(true);
      }
    } catch {
      setVerifyError("Une erreur réseau est survenue.");
      setVerifyLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 font-black text-white shadow-lg shadow-violet-600/30">
            C
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Connexion</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Accédez à vos favoris, votre historique et vos contenus exclusifs
          </p>
        </div>

        {/* Mode vérification email */}
        {emailUnverified ? (
          <>
            {verifySuccess ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  Email vérifié avec succès !
                </p>
                <p className="mt-1 text-xs text-emerald-400/80">
                  Connexion en cours…
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
                  <p className="font-semibold">Vérification requise</p>
                  <p className="mt-1">
                    Votre adresse <span className="font-mono">{email}</span> n&apos;est pas encore vérifiée.
                    Recevez un code par email et saisissez-le ci-dessous pour activer votre compte.
                  </p>
                </div>

                {verifyError && (
                  <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                    {verifyError}
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Code de vérification</label>
                    <div className="relative mt-1">
                      <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 tracking-[0.5em] font-mono text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading || verifyCode.length < 4}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 disabled:opacity-50 transition-colors"
                  >
                    {verifyLoading ? "Vérification..." : "Vérifier mon email"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={verifyResending}
                    className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${verifyResending ? "animate-spin" : ""}`} />
                    {verifyResending ? "Envoi en cours..." : "Renvoyer le code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailUnverified(false);
                      setVerifyError("");
                      setVerifyCode("");
                    }}
                    className="text-zinc-500 hover:text-zinc-400 transition-colors"
                  >
                    Changer d&apos;email
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* Mode connexion normale */
          <>
            {error && (
              <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs text-violet-400">
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
                    className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
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
                    className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                {loading ? "Connexion..." : "Se connecter"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-500">
              Pas encore de compte ?{" "}
              <Link href="/inscription" className="text-violet-400 hover:underline">
                Créer un compte
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

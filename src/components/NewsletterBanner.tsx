"use client";

import { useState } from "react";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export function NewsletterBanner() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setStatus("error");
      setMessage("Veuillez cocher la case de consentement.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error);
      }
    } catch {
      setStatus("error");
      setMessage("Erreur de connexion.");
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8">
      <div className="max-w-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-violet-500" />
          Restez informé des sorties et nouveaux films
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          Recevez une fois par mois la sélection éditoriale des nouvelles œuvres autorisées sur la plateforme.
        </p>

        {status === "success" ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@exemple.com"
                className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                {status === "loading" ? "Inscription..." : "S'abonner"}
              </button>
            </div>

            <label className="flex items-start gap-2 text-[11px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-violet-600 focus:ring-0"
              />
              <span>
                J&apos;accepte de recevoir la newsletter mensuelle. Vous pouvez vous désinscrire à tout moment via le lien en bas de chaque e-mail.
              </span>
            </label>

            {status === "error" && (
              <p className="text-xs text-violet-400 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

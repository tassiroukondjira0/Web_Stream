"use client";

import { useState } from "react";
import { Bell, Send, Users, Star } from "lucide-react";

type Target = "ALL" | "SUBSCRIBERS";
type AnnouncementType = "NOUVEAUTE" | "ANNONCE";

export function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState<Target>("ALL");
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("NOUVEAUTE");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || undefined,
          target,
          type: announcementType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      setResult(data.message || `${data.count} notification(s) envoyée(s)`);
      setTitle("");
      setMessage("");
      setLink("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
        <Bell className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Notifications in-app</h2>
        <span className="ml-auto text-xs text-zinc-500">Envoyer aux utilisateurs</span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-300 mb-1">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="Ex: Nouveau film ajouté"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-300 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              maxLength={500}
              placeholder="Message à afficher dans la cloche de notification"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-300 mb-1">Lien (optionnel)</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Ex: /film/123 ou /premium"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-300 mb-2">Type d'annonce</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAnnouncementType("NOUVEAUTE")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${
                  announcementType === "NOUVEAUTE"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                🎬 Nouveautés
              </button>
              <button
                type="button"
                onClick={() => setAnnouncementType("ANNONCE")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${
                  announcementType === "ANNONCE"
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                📢 Autre annonce
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {announcementType === "NOUVEAUTE"
                ? "Annonce de nouveaux titres ajoutés au catalogue"
                : "Annonce générale (maintenance, événement, etc.)"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-300 mb-2">Destinataires</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTarget("ALL")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${
                  target === "ALL"
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <Users className="h-4 w-4" />
                Tous les utilisateurs
              </button>
              <button
                type="button"
                onClick={() => setTarget("SUBSCRIBERS")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${
                  target === "SUBSCRIBERS"
                    ? "bg-amber-500 text-black"
                    : "border border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <Star className="h-4 w-4" />
                Abonnés Premium uniquement
              </button>
            </div>
          </div>
        </div>

        {result && <div className="rounded-xl bg-emerald-500/10 text-emerald-400 px-4 py-2 text-sm">{result}</div>}
        {error && <div className="rounded-xl bg-rose-500/10 text-rose-400 px-4 py-2 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !title.trim() || !message.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {loading ? "Envoi en cours..." : "Envoyer la notification"}
          </button>
        </div>
      </form>
    </div>
  );
}

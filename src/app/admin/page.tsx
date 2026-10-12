"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Plus, Trash2, Film, CheckCircle2, AlertTriangle, Eye, Lock } from "lucide-react";

interface MediaRecord {
  id: string;
  title: string;
  slug: string;
  type: string;
  accessLevel: string;
  releaseYear: number;
  durationMinutes: number | null;
  isPublished: boolean;
  rightsValidUntil: string;
}

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [medias, setMedias] = useState<MediaRecord[]>([]);
  const [stats, setStats] = useState({ totalMedias: 0, published: 0, premium: 0, free: 0 });
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [accessLevel, setAccessLevel] = useState("FREE");
  const [releaseYear, setReleaseYear] = useState(2026);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [rightsValidUntil, setRightsValidUntil] = useState("2030-12-31");
  const [message, setMessage] = useState("");

  const loadData = () => {
    fetch("/api/admin/medias")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setIsAdmin(true);
        setMedias(data.medias);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("/api/admin/medias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          synopsis,
          accessLevel,
          releaseYear,
          durationMinutes,
          rightsValidUntil,
          isPublished: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setSlug("");
        setSynopsis("");
        setMessage("Titre ajouté au catalogue !");
        loadData();
      } else {
        setMessage(data.error || "Erreur lors de l'ajout.");
      }
    } catch {
      setMessage("Erreur réseau.");
    }
  };

  const handleDelete = async (targetSlug: string) => {
    if (!confirm(`Supprimer définitivement ${targetSlug} du catalogue ?`)) return;

    try {
      const res = await fetch(`/api/admin/medias?slug=${targetSlug}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center text-sm text-zinc-400">
        Vérification des permissions administratives...
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Accès Refusé</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Cette zone est strictement réservée aux administrateurs de la plateforme (Rôle ADMIN requis).
        </p>
        <div className="mt-6">
          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
          >
            Se connecter en tant qu&apos;Administrateur
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* En-tête Back-office */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Espace d&apos;Administration
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            Gestion du Catalogue & Droits
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter une œuvre
        </button>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          {message}
        </div>
      )}

      {/* Cartes Métriques */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">Total Catalogue</span>
          <div className="mt-2 text-3xl font-black text-white">{stats.totalMedias}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">En Ligne (Publiés)</span>
          <div className="mt-2 text-3xl font-black text-emerald-400">{stats.published}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">Contenus Premium</span>
          <div className="mt-2 text-3xl font-black text-amber-400">{stats.premium}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">Contenus Gratuits</span>
          <div className="mt-2 text-3xl font-black text-blue-400">{stats.free}</div>
        </div>
      </div>

      {/* Tableau du catalogue */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Œuvres sous gestion légale</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-zinc-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Titre & Slug</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Accès</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5">Droits jusqu&apos;au</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {medias.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">
                    <div>{m.title}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">/films/{m.slug}</div>
                  </td>
                  <td className="px-6 py-4">{m.type}</td>
                  <td className="px-6 py-4">
                    {m.accessLevel === "PREMIUM" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        PREMIUM
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        GRATUIT
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {m.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-zinc-400">
                    {new Date(m.rightsValidUntil) < new Date() ? (
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Expiré
                      </span>
                    ) : (
                      m.rightsValidUntil.split("T")[0]
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/films/${m.slug}`}
                      className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      title="Voir la fiche"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(m.slug)}
                      className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'ajout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Ajouter un nouveau média</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1">Titre de l&apos;œuvre</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Le Chant de la Forêt"
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Slug URL (laisser vide pour auto)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="le-chant-de-la-foret"
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Synopsis</label>
                <textarea
                  required
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Court résumé de l'œuvre..."
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1">Niveau d&apos;accès</label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                  >
                    <option value="FREE">Gratuit</option>
                    <option value="PREMIUM">Premium (Abonnés)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">Validité des droits</label>
                  <input
                    type="date"
                    value={rightsValidUntil}
                    onChange={(e) => setRightsValidUntil(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

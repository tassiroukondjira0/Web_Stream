"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { shouldOptimizeImage } from "@/lib/image";
import { ShieldCheck, Plus, Trash2, CheckCircle2, AlertTriangle, Eye, EyeOff, Lock, Download, Pencil, RefreshCw, Database, Library } from "lucide-react";
import { TrafficCharts } from "@/components/admin/TrafficCharts";

interface SyncRunRecord {
  id: string;
  status: string;
  pagesFetched: number;
  assetsUpserted: number;
  assetsPruned: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface SyncStatus {
  assets: { total: number; movies: number; series: number; animes: number };
  runs: SyncRunRecord[];
}

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
  videoUrl?: string;
  episodeSources?: {
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    videoUrl: string;
  }[];
}

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [medias, setMedias] = useState<MediaRecord[]>([]);
  const [stats, setStats] = useState({ totalMedias: 0, published: 0, premium: 0, free: 0, partnerTotal: 0 });
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [accessLevel, setAccessLevel] = useState("FREE");
  const [releaseYear] = useState(2026);
  const [durationMinutes] = useState(15);
  const [rightsValidUntil, setRightsValidUntil] = useState("2030-12-31");
  const [message, setMessage] = useState("");

  // Import TMDB
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"MOVIE" | "SERIES">("MOVIE");
  const [importPages, setImportPages] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  // Synchro catalogue partenaire
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncPages, setSyncPages] = useState(2);
  const [syncing, setSyncing] = useState(false);
  const [tmdbSyncing, setTmdbSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // Titres partenaires (ProviderAsset) — publication contrôlée par l'admin
  interface PartnerAsset {
    id: string;
    title: string;
    provider: string;
    contentType: string;
    posterUrl: string | null;
    isPublished: boolean;
    releaseYear: number | null;
  }
  const [partnerAssets, setPartnerAssets] = useState<PartnerAsset[]>([]);
  const [partnerTotal, setPartnerTotal] = useState(0);
  const [partnerFilter, setPartnerFilter] = useState(""); // texte de recherche
  const [partnerProvider, setPartnerProvider] = useState(""); // filtre fournisseur
  const [partnerPage, setPartnerPage] = useState(1);
  const [partnerPages, setPartnerPages] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Édition / publication d'un média
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSlug, setEditSlug] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editEpisodeSources, setEditEpisodeSources] = useState<NonNullable<MediaRecord["episodeSources"]>>([]);
  const [editEpisodeSourcesLoaded, setEditEpisodeSourcesLoaded] = useState(false);
  const [editContentType, setEditContentType] = useState("");
  const [editAccessLevel, setEditAccessLevel] = useState("FREE");
  const [editRightsUntil, setEditRightsUntil] = useState("2030-12-31");
  const [editPublished, setEditPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");

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

    // Historique synchro + compteurs d'assets (non bloquant).
    fetch("/api/admin/sync/partner")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) setSyncStatus({ assets: data.assets, runs: data.runs });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.role === "SUPER_ADMIN") setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.role === "SUPER_ADMIN") setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Chargement des titres partenaires (publication admin) — rechargé à chaque
  // changement de filtre ou de page.
  useEffect(() => {
    const params = new URLSearchParams({ page: String(partnerPage), pageSize: "12" });
    if (partnerFilter) params.set("q", partnerFilter);
    if (partnerProvider) params.set("provider", partnerProvider);
    fetch(`/api/admin/provider-assets?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPartnerAssets(data.items || []);
          setPartnerTotal(data.totalItems || 0);
          setPartnerPages(data.totalPages || 1);
        }
      })
      .catch(() => {});
  }, [partnerFilter, partnerProvider, partnerPage]);

  const togglePartnerPublished = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await fetch("/api/admin/provider-assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPartnerAssets((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isPublished: !a.isPublished } : a)),
        );
      }
    } catch {
      // silencieux
    } finally {
      setTogglingId(null);
    }
  };

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

  const openEdit = async (media: MediaRecord) => {
    setEditSlug(media.slug);
    setEditVideoUrl(media.videoUrl || "");
    setEditEpisodeSources([]);
    setEditEpisodeSourcesLoaded(false);
    setEditContentType(media.type);
    setEditAccessLevel(media.accessLevel || "FREE");
    setEditRightsUntil(
      media.rightsValidUntil ? media.rightsValidUntil.split("T")[0] : "2030-12-31"
    );
    setEditPublished(media.isPublished);
    setEditMessage("");
    setShowEditModal(true);
    try {
      const response = await fetch(`/api/admin/medias?slug=${encodeURIComponent(media.slug)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Impossible de charger les sources du média.");
      }
      setEditVideoUrl(data.media.videoUrl || "");
      setEditEpisodeSources(data.media.episodeSources || []);
      setEditEpisodeSourcesLoaded(true);
    } catch (error) {
      setEditMessage(
        error instanceof Error ? error.message : "Impossible de charger les sources du média."
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditMessage("");

    try {
      const res = await fetch("/api/admin/medias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: editSlug,
          videoUrl: editVideoUrl.trim(),
          ...(editEpisodeSourcesLoaded ? { episodeSources: editEpisodeSources } : {}),
          accessLevel: editAccessLevel,
          rightsValidUntil: editRightsUntil,
          isPublished: editPublished,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        setMessage(data.message || "Média mis à jour.");
        loadData();
      } else {
        setEditMessage(data.message || "Erreur lors de l'enregistrement.");
      }
    } catch {
      setEditMessage("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  const handleImportTmdb = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportMessage("");

    try {
      const res = await fetch("/api/admin/import/tmdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, pages: importPages }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportMessage(data.message || "Import terminé.");
        setShowImportModal(false);
        setMessage(data.message || "Import TMDB terminé.");
        loadData();
      } else {
        setImportMessage(data.message || "Erreur lors de l'import TMDB.");
      }
    } catch {
      setImportMessage("Erreur réseau lors de l'import.");
    } finally {
      setImporting(false);
    }
  };

  const handleSyncPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setSyncMessage("");

    try {
      const res = await fetch("/api/admin/sync/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: syncPages }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncMessage(data.message || "Synchro terminée.");
        loadData();
      } else {
        setSyncMessage(data.message || "Erreur lors de la synchro.");
      }
    } catch {
      setSyncMessage("Erreur réseau lors de la synchro.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncTmdb = async (e: React.FormEvent) => {
    e.preventDefault();
    setTmdbSyncing(true);
    setSyncMessage("");

    try {
      const res = await fetch("/api/admin/sync/tmdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: syncPages }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncMessage(data.message || "Synchro TMDB terminée.");
        loadData();
      } else {
        setSyncMessage(data.message || "Erreur lors de la synchro TMDB.");
      }
    } catch {
      setSyncMessage("Erreur réseau lors de la synchro TMDB.");
    } finally {
      setTmdbSyncing(false);
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-4">
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Importer depuis TMDB
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter une œuvre
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          {message}
        </div>
      )}

      {/* Cartes Métriques */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">Total Catalogue</span>
          <div className="mt-2 text-3xl font-black text-white">{stats.totalMedias}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">Publications (catalogue local)</span>
          <div className="mt-2 text-3xl font-black text-emerald-400">{stats.published}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <span className="text-xs text-zinc-400">Titres partenaires</span>
          <div className="mt-2 text-3xl font-black text-purple-400">{stats.partnerTotal}</div>
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

      {/* Trafic du site — visiteurs mensuels, premium vs standard */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-white">Trafic & audience</h2>
        <TrafficCharts />
      </div>

      {/* Catalogue partenaire — synchro incrémentale */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40" style={{ display: isSuperAdmin ? undefined : "none" }}>
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-400" />
              Catalogue partenaire
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              {syncStatus
                ? `${syncStatus.assets.total} asset(s) en base — ${syncStatus.assets.movies} films, ${syncStatus.assets.series} séries, ${syncStatus.assets.animes} animés.`
                : "Chargement de l'état du catalogue partenaire..."}
            </p>
          </div>
          <form onSubmit={handleSyncPartner} className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-zinc-400">
              Pages
              <input
                type="number"
                min={1}
                max={20}
                value={syncPages}
                onChange={(e) => setSyncPages(Math.min(Math.max(Number(e.target.value) || 1, 1), 20))}
                className="ml-2 w-16 rounded-xl border border-white/10 bg-black/50 p-2 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Synchro en cours..." : "Lancer la synchro"}
            </button>
            <button
              type="button"
              onClick={handleSyncTmdb}
              disabled={tmdbSyncing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800 px-4 py-2 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${tmdbSyncing ? "animate-spin" : ""}`} />
              {tmdbSyncing ? "Synchro TMDB…" : "Synchro TMDB"}
            </button>
          </form>
        </div>

        {syncMessage && (
          <div className="mx-6 mt-4 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-300">
            {syncMessage}
          </div>
        )}

        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[640px] text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-zinc-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 sm:px-6">Démarré le</th>
                <th className="px-4 py-3.5 sm:px-6">Statut</th>
                <th className="px-4 py-3.5 sm:px-6">Pages</th>
                <th className="px-4 py-3.5 sm:px-6">À jour</th>
                <th className="px-4 py-3.5 sm:px-6">Purgés</th>
                <th className="px-4 py-3.5 sm:px-6">Erreur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!syncStatus || syncStatus.runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-zinc-500 sm:px-6">
                    Aucune synchronisation enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                syncStatus.runs.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-400 sm:px-6">
                      {new Date(r.startedAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      {r.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Succès
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-violet-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-6">{r.pagesFetched}</td>
                    <td className="px-4 py-3 sm:px-6">{r.assetsUpserted}</td>
                    <td className="px-4 py-3 sm:px-6">{r.assetsPruned}</td>
                    <td className="px-4 py-3 sm:px-6 max-w-xs truncate text-zinc-500" title={r.error || ""}>
                      {r.error || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau du catalogue */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6">
          <h2 className="text-base font-bold text-white">Œuvres sous gestion légale</h2>
        </div>

        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[720px] text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-zinc-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 sm:px-6">Titre & Slug</th>
                <th className="px-4 py-3.5 sm:px-6">Type</th>
                <th className="px-4 py-3.5 sm:px-6">Accès</th>
                <th className="px-4 py-3.5 sm:px-6">Statut</th>
                <th className="px-4 py-3.5 sm:px-6">Droits jusqu&apos;au</th>
                <th className="px-4 py-3.5 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {medias.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4 font-medium text-white sm:px-6">
                    <div>{m.title}</div>
                    <div className="text-[11px] text-zinc-500 font-mono break-all">/films/{m.slug}</div>
                  </td>
                  <td className="px-4 py-4 sm:px-6">{m.type}</td>
                  <td className="px-4 py-4 sm:px-6">
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
                  <td className="px-4 py-4 sm:px-6">
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
                  <td className="px-4 py-4 font-mono text-[11px] text-zinc-400 sm:px-6">
                    {new Date(m.rightsValidUntil) < new Date() ? (
                      <span className="text-violet-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Expiré
                      </span>
                    ) : (
                      m.rightsValidUntil.split("T")[0]
                    )}
                  </td>
                  <td className="px-4 py-4 text-right sm:px-6">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/films/${m.slug}`}
                        className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        title="Voir la fiche"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(m)}
                        className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        title="Éditer / Publier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.slug)}
                        className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:bg-violet-500/10 hover:text-violet-400"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Titres partenaires (catalogues externes) — publication par l'admin */}
      <div className="mt-10" style={{ display: isSuperAdmin ? undefined : "none" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Library className="h-5 w-5 text-violet-400" />
              Titres partenaires (catalogues externes)
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {partnerTotal.toLocaleString("fr-FR")} titre(s) synchronisé(s). Un titre masqué
              disparaît des grilles, de la recherche et de la une, mais reste en base.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={partnerFilter}
              onChange={(e) => {
                setPartnerFilter(e.target.value);
                setPartnerPage(1);
              }}
              placeholder="Rechercher un titre…"
              className="w-44 rounded-xl border border-white/10 bg-black/50 p-2 text-xs text-white placeholder:text-zinc-500"
            />
            <select
              value={partnerProvider}
              onChange={(e) => {
                setPartnerProvider(e.target.value);
                setPartnerPage(1);
              }}
              className="rounded-xl border border-white/10 bg-black/50 p-2 text-xs text-white"
            >
              <option value="">Tous les fournisseurs</option>
              <option value="FRENCHSTREAM">Partenaire</option>
              <option value="FRENCHMANGA">French-Manga</option>
              <option value="TMDB">TMDB</option>
            </select>
          </div>
        </div>

        {partnerAssets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-xs text-zinc-500">
            Aucun titre partenaire synchronisé. Lancez une synchro depuis le panneau précédent.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {partnerAssets.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  a.isPublished ? "border-white/10 bg-zinc-900/60" : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <Image
                  src={a.posterUrl || "/placeholder-poster.svg"}
                  alt=""
                  width={44}
                  height={64}
                  unoptimized={!shouldOptimizeImage(a.posterUrl || "/placeholder-poster.svg")}
                  className="h-16 w-11 flex-shrink-0 rounded-lg object-cover bg-zinc-800"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white" title={a.title}>
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {a.provider} · {a.contentType}
                    {a.releaseYear ? ` · ${a.releaseYear}` : ""}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      a.isPublished
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {a.isPublished ? "Publié" : "Masqué"}
                  </span>
                </div>
                <button
                  onClick={() => togglePartnerPublished(a.id)}
                  disabled={togglingId === a.id}
                  title={a.isPublished ? "Masquer ce titre" : "Publier ce titre"}
                  className={`flex-shrink-0 rounded-lg p-2 transition-colors disabled:opacity-50 ${
                    a.isPublished
                      ? "text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                      : "text-amber-400 hover:bg-emerald-500/10 hover:text-emerald-400"
                  }`}
                >
                  {togglingId === a.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : a.isPublished ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {partnerPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setPartnerPage((p) => Math.max(1, p - 1))}
              disabled={partnerPage <= 1}
              className="rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="text-xs text-zinc-500">
              Page {partnerPage} / {partnerPages}
            </span>
            <button
              onClick={() => setPartnerPage((p) => Math.min(partnerPages, p + 1))}
              disabled={partnerPage >= partnerPages}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Modal d'édition / publication */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Éditer &amp; publier</h3>
            <p className="text-xs text-zinc-400 mb-4 font-mono">/{editSlug}</p>
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {editContentType !== "SERIES" && (
                <div>
                  <label className="block text-zinc-300 mb-1">URL de lecture du média</label>
                  <input
                    type="url"
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    placeholder="https://votre-domaine/film.m3u8"
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Fichier vidéo direct (MP4/WebM) ou playlist HLS (.m3u8), dont vous détenez les droits.
                  </p>
                </div>
              )}

              {editEpisodeSources.length > 0 && (
                <fieldset className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-white/10 p-3">
                  <legend className="px-1 text-zinc-300">Sources des épisodes</legend>
                  {editEpisodeSources.map((episode, index) => (
                    <label
                      key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                      className="block"
                    >
                      <span className="mb-1 block text-zinc-400">
                        Saison {episode.seasonNumber}, épisode {episode.episodeNumber} — {episode.title}
                      </span>
                      <input
                        type="url"
                        value={episode.videoUrl}
                        onChange={(event) =>
                          setEditEpisodeSources((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, videoUrl: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="https://votre-domaine/episode.m3u8"
                        className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                      />
                    </label>
                  ))}
                </fieldset>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1">Niveau d&apos;accès</label>
                  <select
                    value={editAccessLevel}
                    onChange={(e) => setEditAccessLevel(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                  >
                    <option value="FREE">Gratuit</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">Validité des droits</label>
                  <input
                    type="date"
                    value={editRightsUntil}
                    onChange={(e) => setEditRightsUntil(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                Publier cette fiche (visible publiquement)
              </label>

              {editMessage && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
                  {editMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !editEpisodeSourcesLoaded}
                  className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'import TMDB */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Importer depuis TMDB</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Récupère les métadonnées et affiches officielles. Les fiches sont créées en <span className="text-amber-400 font-semibold">brouillon</span> : vous devrez ajouter une vidéo licenciée puis publier.
            </p>
            <form onSubmit={handleImportTmdb} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1">Type de contenu</label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as "MOVIE" | "SERIES")}
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                >
                  <option value="MOVIE">Films populaires</option>
                  <option value="SERIES">Séries (avec saisons &amp; épisodes)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Nombre de pages (20 titres/page)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={importPages}
                  onChange={(e) => setImportPages(Math.min(Math.max(Number(e.target.value) || 1, 1), 5))}
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white"
                />
                <p className="mt-1 text-[11px] text-zinc-500">Maximum 5 pages. Pour les séries, chaque fiche déclenche aussi l&apos;import des saisons/épisodes.</p>
              </div>

              {importMessage && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-zinc-300">
                  {importMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  {importing ? "Import en cours..." : "Lancer l'import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500"
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

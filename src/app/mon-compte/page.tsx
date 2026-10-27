"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  LogOut,
  Clock,
  Bookmark,
  ListPlus,
  Sparkles,
  Play,
  X,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { providerSlugHref } from "@/lib/provider-catalog";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

interface PlaybackEntry {
  mediaSlug: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  progressSeconds: number;
  totalSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [history, setHistory] = useState<PlaybackEntry[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
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

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/bookmarks", {
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : { bookmarks: [] })),
      fetch("/api/wishlist", {
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : { wishlist: [] })),
      fetch("/api/history", {
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : { history: [] })),
    ])
      .then(([b, w, h]) => {
        setBookmarks(Array.isArray(b.bookmarks) ? b.bookmarks : []);
        setWishlist(Array.isArray(w.wishlist) ? w.wishlist : []);
        setHistory(Array.isArray(h.history) ? h.history : []);
      })
      .catch(() => {
        setBookmarks([]);
        setWishlist([]);
        setHistory([]);
      })
      .finally(() => setListsLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
    router.refresh();
  };

  const removeBookmark = async (slug: string) => {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaSlug: slug }),
    });
    if (res.ok) setBookmarks((prev) => prev.filter((s) => s !== slug));
  };

  const removeWishlist = async (slug: string) => {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaSlug: slug }),
    });
    if (res.ok) setWishlist((prev) => prev.filter((s) => s !== slug));
  };

  const submitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);
    if (newPassword !== confirmPassword) {
      setPwdError("La confirmation ne correspond pas.");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwdError(data.error || "Erreur lors du changement de mot de passe.");
        return;
      }
      setPwdSuccess(data.message || "Mot de passe modifié avec succès.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwdError("Erreur réseau.");
    } finally {
      setPwdLoading(false);
    }
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
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500"
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

  const isPremium = user.role === "SUBSCRIBER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const resumed = history.filter((entry) => !entry.completed).slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* En-tête profil */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-amber-600 text-2xl font-black text-white shadow-xl">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowChangePassword((v) => !v);
              setPwdError(null);
              setPwdSuccess(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <KeyRound className="h-4 w-4" />
            Changer le mot de passe
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {showChangePassword && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Changer mon mot de passe
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Minimum 8 caractères, avec au moins 3 types différents (minuscules, majuscules, chiffres, symboles).
          </p>
          <form onSubmit={submitChangePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400">Mot de passe actuel</label>
              <div className="mt-1 relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white pr-10"
                  required
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Nouveau mot de passe</label>
              <div className="mt-1 relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white pr-10"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Confirmer le nouveau mot de passe</label>
              <div className="mt-1 relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white pr-10"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {pwdError && <div className="sm:col-span-2 text-xs text-red-400">{pwdError}</div>}
            {pwdSuccess && <div className="sm:col-span-2 text-xs text-emerald-400">{pwdSuccess}</div>}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pwdLoading}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {pwdLoading ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Carte d'Abonnement Freemium */}
      <div className="mt-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Formule active
              </span>
              <h2 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
                {isPremium ? (user?.role === "SUPER_ADMIN" ? "Super Administrateur" : "Pass Premium Haute Définition") : "Formule Standard Gratuite"}
                {isPremium && <Sparkles className="h-5 w-5 text-amber-400" />}
              </h2>
              <p className="mt-2 text-sm text-zinc-400 max-w-xl">
                {isPremium
                  ? "Vous disposez d'un accès illimité à l'intégralité du catalogue, aux titres exclusifs et aux résolutions 4K sans interruption publicitaire."
                  : "Vous profitez des Œuvres d'appel et du catalogue public libre de droits. Passez à la formule Premium pour débloquer les titres exclusifs."}
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
                   {user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? "Accès illimité (Administrateur)" : "Abonnement actif jusqu'au 31/12/2026"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections Favoris & Reprise de lecture */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Favoris â€” persistÃ©s en base */}
        <div id="favoris" className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Bookmark className="h-4 w-4 text-violet-500" />
              Mes favoris
              {!listsLoading && bookmarks.length > 0 && (
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-bold text-violet-400">
                  {bookmarks.length}
                </span>
              )}
            </h3>
            <Link href="/films" className="text-xs text-zinc-400 hover:text-white">
              Explorer â†’
            </Link>
          </div>
          {listsLoading ? (
            <p className="mt-4 text-center text-xs text-zinc-500">Chargement…</p>
          ) : bookmarks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
              Aucun favori pour le moment. Cliquez sur « Ajouter à mes favoris »
              sur la fiche d&apos;un film ou d&apos;une série.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {bookmarks.map((slug) => (
                <li
                  key={slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2"
                >
                  <Link
                    href={slugToHref(slug)}
                    className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200 hover:text-white"
                  >
                    {prettyTitle(slug)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeBookmark(slug)}
                    title="Retirer des favoris"
                    className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-violet-500/10 hover:text-violet-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Liste de souhaits â€” persistÃ©e en base */}
        <div id="souhaits" className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <ListPlus className="h-4 w-4 text-amber-400" />
              Ma liste de souhaits
              {!listsLoading && wishlist.length > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                  {wishlist.length}
                </span>
              )}
            </h3>
            <Link href="/series" className="text-xs text-zinc-400 hover:text-white">
              Explorer â†’
            </Link>
          </div>
          {listsLoading ? (
            <p className="mt-4 text-center text-xs text-zinc-500">Chargement…</p>
          ) : wishlist.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
              Aucune envie pour le moment. Cliquez sur « Ajouter à ma liste de
              souhaits » sur la fiche d&apos;un titre.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {wishlist.map((slug) => (
                <li
                  key={slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2"
                >
                  <Link
                    href={slugToHref(slug)}
                    className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200 hover:text-white"
                  >
                    {prettyTitle(slug)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeWishlist(slug)}
                    title="Retirer de la liste"
                    className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reprise de lecture */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Clock className="h-4 w-4 text-amber-500" />
              Reprendre la lecture
            </h3>
            <span className="text-xs text-zinc-500">Synchronisé</span>
          </div>
          <p className="text-xs text-zinc-400">
            Votre position de lecture est sauvegardée automatiquement toutes les 10 secondes.
          </p>
          {listsLoading ? (
            <p className="mt-4 text-center text-xs text-zinc-500">Chargement…</p>
          ) : resumed.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
              Aucune session en cours. Lancez un film depuis le catalogue pour démarrer la lecture.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {resumed.map((entry) => {
                const percent =
                  entry.totalSeconds > 0
                    ? Math.min(100, Math.round((entry.progressSeconds / entry.totalSeconds) * 100))
                    : 0;
                return (
                  <li key={`${entry.mediaSlug}-${entry.seasonNumber ?? ""}-${entry.episodeNumber ?? ""}`}>
                    <Link
                      href={progressHref(entry)}
                      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2.5 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                        <Play className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-zinc-200 group-hover:text-white">
                          {prettyTitle(entry.mediaSlug)}
                          {entry.episodeNumber != null && (
                            <span className="text-zinc-500">
                              {entry.seasonNumber != null ? ` Â· S${entry.seasonNumber}` : ""}
                              {` Â· Ã‰p. ${entry.episodeNumber}`}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <span className="h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full bg-violet-500"
                              style={{ width: `${Math.max(2, percent)}%` }}
                            />
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-500">
                            {percent}% à· {formatTime(entry.progressSeconds)}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Route de fiche correspondant Ã  un slug (local ou partenaire externe). */
function slugToHref(slug: string): string {
  return providerSlugHref(slug);
}

/** Lien de reprise : fiche + saison/Ã©pisode exacts. */
function progressHref(entry: PlaybackEntry): string {
  const base = slugToHref(entry.mediaSlug);
  const query = new URLSearchParams();
  if (entry.seasonNumber != null) query.set("season", String(entry.seasonNumber));
  if (entry.episodeNumber != null) query.set("ep", String(entry.episodeNumber));
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

/** DurÃ©e mm:ss (ou h:mm:ss) pour l'affichage de la progression. */
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** LibellÃ© lisible Ã  partir d'un slug (sans appel rÃ©seau). */
function prettyTitle(slug: string): string {
  const m = slug.match(/^(partner|frenchmanga|tmdb|fstreamtv)-(movie|series|anime)-(.+)$/);
  if (m) {
    const [, , kind, id] = m;
    return `${humanize(id)} ${kind === "movie" ? "Â· Film" : kind === "series" ? "Â· Série" : "Â· Animé"}`;
  }
  return humanize(slug);
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}


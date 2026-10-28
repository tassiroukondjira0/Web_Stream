"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2, ArrowLeft } from "lucide-react";

interface AdminReview {
  id: string;
  mediaSlug: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setReviews(data.reviews || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Suppression impossible");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Avis des utilisateurs</h1>
      </div>

      {loading ? (
        <p className="text-zinc-400">Chargement…</p>
      ) : error ? (
        <p className="text-rose-400">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="text-zinc-400">Aucun avis.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-white">{r.userName}</span>
                  <span className="ml-2 text-xs text-zinc-500">{r.userEmail}</span>
                  <span className="ml-2 text-xs text-zinc-500">· {r.mediaSlug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label="Supprimer l'avis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-zinc-300">{r.comment}</p>}
              <p className="mt-2 text-[10px] text-zinc-500">
                {new Date(r.createdAt).toLocaleString("fr-FR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

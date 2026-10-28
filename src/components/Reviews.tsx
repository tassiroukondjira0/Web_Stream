"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
  isOwn: boolean;
}

interface ReviewsProps {
  mediaSlug: string;
}

export function Reviews({ mediaSlug }: ReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?slug=${encodeURIComponent(mediaSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setAverage(data.average || 0);
        setCount(data.count || 0);
        if (data.currentUserReview) {
          setRating(data.currentUserReview.rating);
          setComment(data.currentUserReview.comment || "");
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsLoggedIn(Boolean(data?.user)))
      .catch(() => setIsLoggedIn(false));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: mediaSlug, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setMessage("Avis enregistré.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/reviews?slug=${encodeURIComponent(mediaSlug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Suppression impossible");
      setRating(5);
      setComment("");
      setMessage("Avis supprimé.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 border-t border-white/10 pt-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Avis des spectateurs</h2>
        {count > 0 && (
          <div className="flex items-center gap-1 text-sm text-zinc-300">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-bold">{average}</span>
            <span className="text-zinc-500">({count})</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-400">Chargement des avis…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">Aucun avis pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{r.userName}</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`}
                    />
                  ))}
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-zinc-300">{r.comment}</p>}
              <p className="mt-2 text-[10px] text-zinc-500">
                {new Date(r.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {isLoggedIn && (
        <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-300">Votre note :</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                aria-label={`Noter ${i + 1} sur 5`}
                className="focus:outline-none"
              >
                <Star
                  className={`h-5 w-5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Votre avis (optionnel)…"
            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
          />
          {message && <p className="text-sm text-zinc-300">{message}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Publier mon avis"}
            </button>
            {reviews.some((r) => r.isOwn) && (
              <button
                type="button"
                onClick={remove}
                disabled={submitting}
                className="rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
              >
                Supprimer
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

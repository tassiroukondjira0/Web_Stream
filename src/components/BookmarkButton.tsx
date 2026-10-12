"use client";

import { useState, useEffect } from "react";
import { Bookmark, Check } from "lucide-react";

interface BookmarkButtonProps {
  mediaSlug: string;
}

export function BookmarkButton({ mediaSlug }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          setIsBookmarked(data.bookmarks.includes(mediaSlug));
        }
      })
      .catch(() => {});
  }, [mediaSlug]);

  const toggleBookmark = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaSlug }),
      });

      if (res.status === 401) {
        window.location.href = "/connexion";
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setIsBookmarked(data.isBookmarked);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors ${
        isBookmarked
          ? "border-red-500/50 bg-red-600/20 text-red-300 hover:bg-red-600/30"
          : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {isBookmarked ? (
        <>
          <Check className="h-4 w-4 text-red-400" />
          Dans mes favoris
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          Ajouter à mes favoris
        </>
      )}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ListPlus, Check } from "lucide-react";

interface WishlistButtonProps {
  mediaSlug: string;
}

export function WishlistButton({ mediaSlug }: WishlistButtonProps) {
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/wishlist", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.wishlist && Array.isArray(data.wishlist)) {
          setInWishlist(data.wishlist.includes(mediaSlug));
        }
      })
      .catch(() => {});
  }, [mediaSlug]);

  const toggleWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mediaSlug }),
      });

      if (res.status === 401) {
        window.location.href = "/connexion";
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setInWishlist(data.inWishlist);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors ${
        inWishlist
          ? "border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
          : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {inWishlist ? (
        <>
          <Check className="h-4 w-4 text-amber-400" />
          Dans ma liste de souhaits
        </>
      ) : (
        <>
          <ListPlus className="h-4 w-4" />
          Ajouter à ma liste de souhaits
        </>
      )}
    </button>
  );
}

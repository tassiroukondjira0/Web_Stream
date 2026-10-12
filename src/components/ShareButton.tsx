"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback vers le presse-papiers si l'utilisateur annule
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
      title="Partager le lien de ce film"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" />
          Lien copié !
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Partager ce film
        </>
      )}
    </button>
  );
}

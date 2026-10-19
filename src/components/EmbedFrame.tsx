"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";

/**
 * Iframe de lecture + bouton « Recharger ».
 *
 * Les embeds gratuits (Vidzy) signent leurs segments CDN avec un token qui
 * expire parfois en cours de lecture (403 sur les segments). Remonter l'iframe
 * (nouvelle clé React = nouveau document) régénère le token côté serveur du
 * lecteur sans recharger notre page ni perdre la sélection langue/épisode.
 */
export function EmbedFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [nonce, setNonce] = useState(0);

  return (
    <>
      <iframe
        key={`${src}#${nonce}`}
        src={src}
        title={title}
        className="h-full w-full"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <button
        type="button"
        onClick={() => setNonce((n) => n + 1)}
        className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-zinc-800/90 px-3 py-2 text-xs font-semibold text-zinc-200 shadow-xl backdrop-blur-sm transition-all hover:bg-zinc-700 hover:scale-105"
        title="Si la lecture est bloquée, rechargez le lecteur pour régénérer le flux"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Recharger le lecteur
      </button>
    </>
  );
}
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";

/**
 * Cadre de lecture (client) : iframe + rechargement + détection de blocage.
 *
 * Les embeds gratuits (Vidzy) signent leurs segments CDN avec un token qui
 * expire parfois en cours de lecture (403 sur les segments). Changer la clé
 * React (nouveau document) régénère le token côté serveur du lecteur sans
 * recharger notre page ni perdre la sélection langue/épisode.
 *
 * L'embed Vidzy poste `{action:'timeupdate'}` au parent toutes les ~2 s
 * pendant la lecture ; un silence prolongé (hors fin de vidéo) signale un
 * blocage. L'auto-recovery recharge alors l'iframe et repositionne la
 * lecture via `postMessage({action:'seek', value})` + `{action:'play'}`.
 */

const STALL_TIMEOUT_MS = 8_000;
const INACTIVITY_MS = 3 * 60 * 1000;
const MAX_AUTO_RETRIES = 3;
/** Délai d'attente avant d'envoyer seek/play après rechargement de l'iframe. */
const RELOAD_WAIT_MS = 3_000;

export function EmbedFrame({
  src,
  title,
  nextHref,
  nextEpisode,
  isMovie,
}: {
  src: string;
  title: string;
  nextHref?: string | null;
  nextEpisode?: number | null;
  isMovie?: boolean;
}) {
  const [nonce, setNonce] = useState(0);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const lastPlaybackUpdate = useRef(0);
  const lastKnownTime = useRef(0);
  const retryCount = useRef(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Seuls les embeds Vidzy passant par /api/embed postent `timeupdate` au
  // parent : les hébergeurs externes (uqload, voe…) communiquent depuis leur
  // propre origine et n'alimentent jamais ces compteurs — inutile de lancer
  // les timers qui déclencheraient un faux « lecture interrompue ».
  const isProxiedEmbed = src.startsWith("/api/embed");

  // Réinitialiser l'état quand la source change (pattern React :
  // ajustement d'état pendant le rendu plutôt que dans un effect).
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setShowReloadPrompt(false);
    setIsRecovering(false);
  }

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = null;
    if (!isProxiedEmbed) return;
    inactivityTimer.current = setTimeout(() => {
      setShowReloadPrompt(true);
    }, INACTIVITY_MS);
  }, [isProxiedEmbed]);

  const reloadPlayer = () => {
    lastPlaybackUpdate.current = 0;
    setNonce((n) => n + 1);
    setShowReloadPrompt(false);
    resetInactivityTimer();
  };

  /** Envoie une commande postMessage à l'iframe Vidzy (seek / play). */
  const postToEmbed = useCallback((message: Record<string, unknown>) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(message, "*");
    } catch {
      // iframe inaccessible (cross-origin) — ignore.
    }
  }, []);

  /** Auto-recovery : recharge l'iframe puis repositionne la lecture. */
  const autoRecover = useCallback(() => {
    retryCount.current += 1;
    lastPlaybackUpdate.current = 0;
    setIsRecovering(true);
    setNonce((n) => n + 1);
    if (recoverTimer.current) clearTimeout(recoverTimer.current);
    recoverTimer.current = setTimeout(() => {
      const t = lastKnownTime.current;
      if (t > 0.5) {
        postToEmbed({ action: "seek", value: t });
      }
      postToEmbed({ action: "play" });
      setIsRecovering(false);
    }, RELOAD_WAIT_MS);
  }, [postToEmbed]);

  // Horodatage du dernier message `timeupdate` reçu de l'iframe Vidzy.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | { action?: unknown; currentTime?: unknown }
        | null
        | undefined;
      if (!data || typeof data !== "object") return;
      if (data.action === "timeupdate") {
        if (typeof data.currentTime !== "number" || !Number.isFinite(data.currentTime)) return;
        lastPlaybackUpdate.current = Date.now();
        lastKnownTime.current = data.currentTime;
        setShowReloadPrompt(false);
      } else if (data.action === "videoEnded") {
        // Fin naturelle : ne pas confondre avec un blocage.
        lastPlaybackUpdate.current = 0;
        setShowReloadPrompt(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Détection de stall : recharge auto puis repli sur le bouton manuel.
  useEffect(() => {
    const id = setInterval(() => {
      const last = lastPlaybackUpdate.current;
      if (last > 0 && Date.now() - last > STALL_TIMEOUT_MS) {
        if (retryCount.current < MAX_AUTO_RETRIES && lastKnownTime.current > 0) {
          autoRecover();
        } else {
          setShowReloadPrompt(true);
        }
      }
    }, 2000);
    return () => clearInterval(id);
  }, [autoRecover]);

  // Nouvelle source : réinitialiser les refs et gérer les timers (l'état
  // est réinitialisé au rendu via la détection prevSrc !== src ci-dessus).
  useEffect(() => {
    lastPlaybackUpdate.current = 0;
    lastKnownTime.current = 0;
    retryCount.current = 0;
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (recoverTimer.current) clearTimeout(recoverTimer.current);
    };
  }, [src, resetInactivityTimer]);

  return (
    <>
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black relative">
        {/* sandbox (embeds proxés uniquement) SANS allow-same-origin : le
            document d'embed obtient une origine opaque, donc ses requêtes
            partent avec `Origin: null`, valeur acceptée par le CDN Vidzy
            (notre domaine réel est rejeté en 403). Le HTML étant servi par
            /api/embed, tout le code (scripts, CSS, media) fonctionne sans
            cookie ni stockage same-origin.
            Attention : Vidzy embarque des kill-switches (__fssSbx/__fssPop)
            qui détruisent le lecteur dès qu'ils détectent une origine
            opaque non partenaire — ils sont désamorcés côté /api/embed.
            Les hébergeurs externes (uqload, voe…) ne passent PAS par ce
            sandbox : ils ont besoin de leur propre origine (cookies, stockage)
            et ne sont pas nos pages à rewriter. */}
        <iframe
          ref={iframeRef}
          key={`${src}#${nonce}`}
          src={src}
          title={title}
          className="h-full w-full"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={
            isProxiedEmbed ? "allow-scripts allow-forms allow-popups allow-presentation" : undefined
          }
        />
        {/* Bouton de rechargement manuel : le token CDN de Vidzy expire
            en cours de lecture (403 sur les segments). Recharger l'iframe
            regenere un nouveau token sans quitter la page. */}
        <button
          type="button"
          onClick={reloadPlayer}
          className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80"
          aria-label="Recharger le lecteur"
          title="Recharger le lecteur"
        >
          <RotateCw className="h-5 w-5" />
        </button>

        {/* Indicateur de reprise automatique. */}
        {isRecovering && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-xl bg-black/80 px-5 py-3 text-white shadow-2xl">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              <span className="text-sm font-medium">Reprise de la lecture…</span>
            </div>
          </div>
        )}

        {nextHref && nextEpisode != null && !isMovie && (
          <Link
            href={nextHref}
            className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/90 text-white text-sm font-semibold shadow-xl backdrop-blur-sm transition-transform hover:bg-violet-600 hover:scale-105"
            aria-label={`Épisode ${nextEpisode}`}
          >
            {nextEpisode}
          </Link>
        )}
      </div>

      {showReloadPrompt && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            La lecture semble interrompue. Rechargez le lecteur pour reprendre la video.
          </p>
          <button
            type="button"
            onClick={reloadPlayer}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-amber-400"
          >
            Recharger le lecteur
          </button>
        </div>
      )}
    </>
  );
}

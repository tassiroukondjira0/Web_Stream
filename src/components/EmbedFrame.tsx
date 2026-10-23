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
 * Le script injecté dans l'iframe (`PLAYER_BRIDGE_SCRIPT`) poste
 * `{action:'timeupdate'|'play'|'pause'|'videoEnded'}` au parent. Une pause
 * manuelle n'est PAS un blocage : le watchdog est suspendu tant que la vidéo
 * est en pause. Un silence prolongé pendant la lecture signale un blocage et
 * déclenche une reprise automatique.
 *
 * La position de lecture est sauvegardée (localStorage + `/api/history`) et
 * renvoyée à l'iframe via `postMessage({action:'seek'})` pour reprendre là où
 * l'utilisateur s'était arrêté.
 */

const STALL_TIMEOUT_MS = 8_000;
const INACTIVITY_MS = 3 * 60 * 1000;
const MAX_AUTO_RETRIES = 3;
/** Délai d'attente avant de masquer l'indicateur de reprise. */
const RELOAD_WAIT_MS = 3_000;
/** Fréquence de sauvegarde pendant la lecture. */
const SAVE_INTERVAL_MS = 10_000;
/** Le bridge applique le seek dès que le <video> est prêt ; on réessaie. */
const SEEK_RETRY_DELAYS = [0, 800, 2_000, 4_000];

interface SavedProgress {
  progressSeconds: number;
  totalSeconds: number;
  completed: boolean;
  updatedAt: number;
}

function localKey(mediaSlug: string, season?: number | null, episode?: number | null): string {
  return `cinemax:playback:${mediaSlug}|${season ?? ""}|${episode ?? ""}`;
}

function readLocal(key: string): SavedProgress | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedProgress> | null;
    if (
      !parsed ||
      typeof parsed.progressSeconds !== "number" ||
      !Number.isFinite(parsed.progressSeconds)
    ) {
      return null;
    }
    return {
      progressSeconds: Math.max(0, parsed.progressSeconds),
      totalSeconds: typeof parsed.totalSeconds === "number" ? parsed.totalSeconds : 0,
      completed: parsed.completed === true,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(key: string, progress: SavedProgress): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Stockage indisponible (navigation privée) : la sauvegarde serveur suffit.
  }
}

export function EmbedFrame({
  src,
  title,
  nextHref,
  nextEpisode,
  isMovie,
  mediaSlug,
  season,
  episode,
}: {
  src: string;
  title: string;
  nextHref?: string | null;
  nextEpisode?: number | null;
  isMovie?: boolean;
  /** Slug du titre (local ou partenaire) pour la sauvegarde de progression. */
  mediaSlug?: string;
  season?: number | null;
  episode?: number | null;
}) {
  const [nonce, setNonce] = useState(0);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const pausedRef = useRef(false);
  const lastPlaybackUpdate = useRef(0);
  const lastKnownTime = useRef(0);
  const durationRef = useRef(0);
  const retryCount = useRef(0);
  const resumeTargetRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  const resumeDeadlineRef = useRef(0);
  const autoPlayRef = useRef(false);
  const lastSaveAt = useRef(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isProxiedEmbed = src.startsWith("/api/embed?src=");
  const isExtEmbed = src.startsWith("/api/embed/ext?u=");
  const progressKey = mediaSlug
    ? localKey(mediaSlug, season ?? null, episode ?? null)
    : null;

  // Raccourci sandbox :
  // - Vidzy a besoin d'une origine opaque (sans allow-same-origin) pour que
  //   ses requêtes CDN partent avec `Origin: null`.
  // - Les hébergeurs externes (voe, uqload, dood, filemoon, etc.) ont besoin de
  //   `allow-same-origin` pour instancier leurs workers HLS (blob:), accéder au
  //   stockage et bufferiser les flux sans blocage.
  const sandboxPolicy = isProxiedEmbed
    ? "allow-scripts allow-forms allow-popups allow-presentation"
    : isExtEmbed
    ? "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
    : undefined;

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
    if (!isProxiedEmbed || pausedRef.current) return;
    inactivityTimer.current = setTimeout(() => {
      setShowReloadPrompt(true);
    }, INACTIVITY_MS);
  }, [isProxiedEmbed]);

  /** Envoie une commande postMessage à l'iframe. */
  const postToEmbed = useCallback((message: Record<string, unknown>) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(message, "*");
    } catch {
      // iframe inaccessible (cross-origin) — ignore.
    }
  }, []);

  const clearSeekTimers = useCallback(() => {
    for (const id of seekTimers.current) clearTimeout(id);
    seekTimers.current = [];
  }, []);

  /** Répète le seek : le bridge le met en file jusqu'à ce que la vidéo soit prête. */
  const sendSeek = useCallback(
    (target: number, play: boolean) => {
      if (!(target > 0.5)) return;
      clearSeekTimers();
      const fire = () => {
        postToEmbed({ action: "seek", value: target });
        if (play) postToEmbed({ action: "play" });
      };
      for (const delay of SEEK_RETRY_DELAYS) {
        seekTimers.current.push(setTimeout(fire, delay));
      }
    },
    [clearSeekTimers, postToEmbed],
  );

  /** Persiste la position (localStorage immédiat + serveur pour les connectés). */
  const saveProgress = useCallback(
    (opts: { beacon?: boolean; force?: boolean; completed?: boolean } = {}) => {
      if (!mediaSlug || !progressKey) return;
      const now = Date.now();
      if (!opts.force && now - lastSaveAt.current < SAVE_INTERVAL_MS) return;

      const total = Math.max(0, Math.floor(durationRef.current));
      let progress = Math.max(0, Math.floor(lastKnownTime.current));
      if (opts.completed && total > 0) progress = total;
      if (progress < 1 && !opts.completed) return;
      // Ne jamais écraser une position sauvegardée par le début de lecture
      // d'un lecteur qui n'a pas encore appliqué le seek de reprise. Passé un
      // délai raisonnable (lecteur capricieux), on reprend la sauvegarde.
      if (
        resumeTargetRef.current > 5 &&
        !resumeAppliedRef.current &&
        progress < resumeTargetRef.current - 5 &&
        Date.now() < resumeDeadlineRef.current
      ) {
        return;
      }

      lastSaveAt.current = now;
      const completed = opts.completed || (total > 0 && progress >= total * 0.95);
      const payload = {
        mediaSlug,
        season: season ?? null,
        episode: episode ?? null,
        progressSeconds: progress,
        totalSeconds: total,
      };
      writeLocal(progressKey, { ...payload, completed, updatedAt: now });

      if (
        opts.beacon &&
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        try {
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          if (navigator.sendBeacon("/api/history", blob)) return;
        } catch {
          // Repli vers fetch keepalive ci-dessous.
        }
      }

      void fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    },
    [episode, mediaSlug, progressKey, season],
  );

  const handlePause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    lastPlaybackUpdate.current = Date.now();
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    setShowReloadPrompt(false);
    saveProgress({ force: true });
  }, [saveProgress]);

  const handlePlay = useCallback(() => {
    if (pausedRef.current) pausedRef.current = false;
    lastPlaybackUpdate.current = Date.now();
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const reloadPlayer = () => {
    autoPlayRef.current = false;
    lastPlaybackUpdate.current = 0;
    setNonce((n) => n + 1);
    setShowReloadPrompt(false);
    resetInactivityTimer();
  };

  /** Auto-recovery : recharge l'iframe puis repositionne la lecture. */
  const autoRecover = useCallback(() => {
    retryCount.current += 1;
    lastPlaybackUpdate.current = 0;
    autoPlayRef.current = true;
    setIsRecovering(true);
    setNonce((n) => n + 1);
    if (recoverTimer.current) clearTimeout(recoverTimer.current);
    recoverTimer.current = setTimeout(() => setIsRecovering(false), RELOAD_WAIT_MS);
  }, []);

  // Charger la progression (locale puis serveur) à chaque changement d'épisode.
  useEffect(() => {
    resumeTargetRef.current = 0;
    resumeAppliedRef.current = false;
    resumeDeadlineRef.current = Date.now() + 15_000;
    lastKnownTime.current = 0;
    durationRef.current = 0;
    lastPlaybackUpdate.current = 0;
    lastSaveAt.current = 0;
    retryCount.current = 0;
    pausedRef.current = false;

    if (!mediaSlug || !progressKey) return;

    const local = readLocal(progressKey);
    if (local && !local.completed && local.progressSeconds >= 5) {
      resumeTargetRef.current = local.progressSeconds;
      sendSeek(local.progressSeconds, true);
    }

    let cancelled = false;
    const params = new URLSearchParams({ mediaSlug });
    if (season != null) params.set("season", String(season));
    if (episode != null) params.set("episode", String(episode));

    fetch(`/api/history?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { progress?: SavedProgress & { updatedAt: string } } | null) => {
        if (cancelled || !data?.progress) return;
        const saved = data.progress;
        if (saved.completed || saved.progressSeconds < 5) return;
        const serverUpdated = Date.parse(saved.updatedAt) || 0;
        if (serverUpdated < (local?.updatedAt ?? 0)) return;
        if (Math.abs(saved.progressSeconds - resumeTargetRef.current) < 2) return;
        resumeTargetRef.current = saved.progressSeconds;
        if (!resumeAppliedRef.current) sendSeek(saved.progressSeconds, true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [episode, mediaSlug, progressKey, season, sendSeek]);

  // Nouveau document (source changée, rechargement ou auto-recovery) : on
  // repositionne la lecture sur la dernière position connue.
  useEffect(() => {
    // Mémorise la position du document sortant avant de charger le nouveau.
    if (lastKnownTime.current > 1) saveProgress({ force: true });
    lastPlaybackUpdate.current = 0;
    pausedRef.current = false;
    const target = lastKnownTime.current > 5 ? lastKnownTime.current : resumeTargetRef.current;
    const shouldPlay = autoPlayRef.current || (lastKnownTime.current <= 5 && target > 5);
    if (target > 5) sendSeek(target, shouldPlay);
    autoPlayRef.current = false;
    resetInactivityTimer();
  }, [nonce, resetInactivityTimer, saveProgress, sendSeek, src]);

  // Messages du bridge injecté dans l'iframe.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = iframeRef.current?.contentWindow;
      if (frame && event.source !== frame) return;
      const data = event.data as
        | {
            action?: unknown;
            currentTime?: unknown;
            duration?: unknown;
            paused?: unknown;
          }
        | null
        | undefined;
      if (!data || typeof data !== "object") return;

      const t = typeof data.currentTime === "number" && Number.isFinite(data.currentTime)
        ? data.currentTime
        : null;
      const d = typeof data.duration === "number" && Number.isFinite(data.duration)
        ? data.duration
        : 0;

      if (data.action === "timeupdate") {
        if (t === null) return;
        lastKnownTime.current = t;
        if (d > 0) durationRef.current = d;
        lastPlaybackUpdate.current = Date.now();
        if (
          resumeTargetRef.current > 5 &&
          !resumeAppliedRef.current &&
          t >= Math.max(1, resumeTargetRef.current - 5)
        ) {
          resumeAppliedRef.current = true;
        }
        if (data.paused === true) {
          handlePause();
        } else {
          if (pausedRef.current) handlePlay();
          resetInactivityTimer();
          saveProgress();
        }
        setShowReloadPrompt(false);
      } else if (data.action === "play") {
        if (t !== null) lastKnownTime.current = t;
        if (d > 0) durationRef.current = d;
        handlePlay();
      } else if (data.action === "pause") {
        if (t !== null) lastKnownTime.current = t;
        if (d > 0) durationRef.current = d;
        handlePause();
      } else if (data.action === "videoEnded") {
        if (t !== null) lastKnownTime.current = t;
        if (d > 0) durationRef.current = d;
        pausedRef.current = true;
        lastPlaybackUpdate.current = 0;
        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
          inactivityTimer.current = null;
        }
        saveProgress({ force: true, completed: true });
        setShowReloadPrompt(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handlePause, handlePlay, resetInactivityTimer, saveProgress]);

  // Détection de stall : jamais pendant une pause manuelle.
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const last = lastPlaybackUpdate.current;
      if (last > 0 && Date.now() - last > STALL_TIMEOUT_MS) {
        if (retryCount.current < MAX_AUTO_RETRIES && lastKnownTime.current > 0) {
          autoRecover();
        } else {
          setShowReloadPrompt(true);
        }
      }
    }, 2_000);
    return () => clearInterval(id);
  }, [autoRecover]);

  // Sauvegarde à la fermeture / mise en arrière-plan de l'onglet.
  useEffect(() => {
    const persist = () => saveProgress({ beacon: true, force: true });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVisibility);
      persist();
    };
  }, [saveProgress]);

  // Nettoyage des timers au démontage.
  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (recoverTimer.current) clearTimeout(recoverTimer.current);
      clearSeekTimers();
    };
  }, [clearSeekTimers]);

  return (
    <>
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black relative">
        <iframe
          ref={iframeRef}
          key={`${src}#${nonce}`}
          src={src}
          title={title}
          className="h-full w-full"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={sandboxPolicy}
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
            La lecture semble interrompue. Rechargez le lecteur pour reprendre la vidéo.
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

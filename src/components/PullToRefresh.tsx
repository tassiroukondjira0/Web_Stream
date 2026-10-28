"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 75; // Distance en pixels pour déclencher l'actualisation
const MAX_PULL = 110;

/**
 * Composant « Pull-to-Refresh » universel :
 * Permet d'actualiser la page en glissant le doigt vers le bas lorsqu'on est au sommet de la page.
 * Fonctionne sur l'app mobile (Capacitor) et sur les navigateurs tactiles.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // On ne démarre le geste que si l'utilisateur est tout en haut de la page
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 1 && !refreshing) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || refreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 2) {
      // Si l'utilisateur a scrollé vers le bas dans la page, on annule le geste
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Effet élastique : plus on tire loin, plus la résistance augmente
      const distance = Math.min(diff * 0.45, MAX_PULL);
      setPullDistance(distance);
    }
  }, [refreshing]);

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(PULL_THRESHOLD * 0.7);

    // Vibration haptique légère si disponible (via Capacitor ou navigateur)
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore
    }

    // Actualise les Server Components et données de la page courante
    router.refresh();

    // Attente visuelle douce avant de masquer l'indicateur
    setTimeout(() => {
      setRefreshing(false);
      setPullDistance(0);
    }, 900);
  }, [router]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, triggerRefresh]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = refreshing ? undefined : `${progress * 360}deg`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center transition-all duration-200"
      style={{
        transform: `translateY(${Math.max(pullDistance - 15, 8)}px)`,
        opacity: Math.max(progress, refreshing ? 1 : 0),
      }}
    >
      <div className="flex items-center gap-2 rounded-full border border-violet-500/30 bg-zinc-900/90 px-3.5 py-1.5 shadow-2xl backdrop-blur-md">
        <RefreshCw
          className={`h-4 w-4 text-violet-400 ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: rotation ? `rotate(${rotation})` : undefined }}
        />
        <span className="text-xs font-medium text-zinc-200">
          {refreshing
            ? "Actualisation…"
            : pullDistance >= PULL_THRESHOLD
            ? "Relâchez pour actualiser"
            : "Tirez pour actualiser"}
        </span>
      </div>
    </div>
  );
}

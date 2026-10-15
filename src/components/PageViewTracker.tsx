"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Enregistre chaque page vue (trafic mensuel du dashboard admin).
 * Envoi unique par chemin, silencieux en cas d'échec.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}

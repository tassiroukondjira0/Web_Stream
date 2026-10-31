import type { NextRequest } from "next/server";

function first(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

function isLoopback(host: string): boolean {
  const hostname = host.replace(/^\[|\]$/g, "").split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0";
}

/** Extrait un paramètre (`host=`, `proto=`) d'un en-tête `Forwarded` (RFC 7239). */
function forwardedParam(value: string | null, name: "host" | "proto"): string | undefined {
  const entry = first(value);
  if (!entry) return undefined;
  const match = new RegExp(`(?:^|;)\\s*${name}=("?)([^";,]+)\\1`, "i").exec(entry);
  return match?.[2]?.trim() || undefined;
}

/**
 * Origine configurée explicitement pour le déploiement courant.
 * `NEXT_PUBLIC_APP_URL` vaut `http://localhost:3000` en développement : les
 * valeurs locales sont ignorées pour ne jamais exposer une origine injoignable.
 */
function configuredOrigin(): string | undefined {
  const raw =
    process.env.APP_ORIGIN ??
    process.env.RENDER_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw.trim());
    if (!isLoopback(url.host)) return url.origin;
  } catch {
    // valeur invalide : on ignore
  }

  return undefined;
}

/**
 * Origine publique de l'application telle que vue par le navigateur.
 * Derrière le proxy de Render, `request.nextUrl.origin` vaut
 * `http://localhost:10000` : on se fie donc aux en-têtes forwardés, puis à la
 * configuration du déploiement, pour ne jamais renvoyer une URL `localhost`.
 */
export function publicOrigin(request: NextRequest): string {
  const host =
    first(request.headers.get("x-forwarded-host")) ??
    forwardedParam(request.headers.get("forwarded"), "host") ??
    first(request.headers.get("host"));

  const proto =
    first(request.headers.get("x-forwarded-proto")) ??
    forwardedParam(request.headers.get("forwarded"), "proto") ??
    request.nextUrl.protocol.replace(":", "") ??
    "https";

  if (host && !isLoopback(host)) return `${proto}://${host}`;

  const configured = configuredOrigin();
  if (configured) return configured;

  // Dernier recours (aucun en-tête public, aucun domaine configuré) : l'origine
  // interne est le seul repère disponible.
  return `${request.nextUrl.protocol}//${host ?? request.nextUrl.host ?? "localhost:3000"}`;
}

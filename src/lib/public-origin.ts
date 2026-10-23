import type { NextRequest } from "next/server";

function first(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

function isLoopback(host: string): boolean {
  const hostname = host.replace(/^\[|\]$/g, "").split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0";
}

/**
 * Origine publique de l'application telle que vue par le navigateur.
 * Derrière le proxy de Render, `request.nextUrl.origin` vaut
 * `http://localhost:10000` : on se fie donc aux en-têtes forwardés ou à
 * l'URL externe fournie par la plateforme.
 */
export function publicOrigin(request: NextRequest): string {
  const forwardedHost = first(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? first(request.headers.get("host"));
  const proto =
    first(request.headers.get("x-forwarded-proto")) ??
    request.nextUrl.protocol.replace(":", "") ??
    "https";

  if (host && !isLoopback(host)) return `${proto}://${host}`;

  const external =
    process.env.RENDER_EXTERNAL_URL ??
    (process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : undefined);
  if (external) {
    try {
      const url = new URL(external);
      if (!isLoopback(url.host)) return url.origin;
    } catch {
      // ignore
    }
  }

  return `${request.nextUrl.protocol}//${host ?? "localhost:3000"}`;
}

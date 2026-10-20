import { NextRequest } from "next/server";

/**
 * Proxy des appels runtime d'un document d'embed Vidzy servi via `/api/embed`.
 *
 * Le document d'embed tourne sur NOTRE origine, mais plusieurs endpoints
 * Vidzy (`gate.php`, `js/domain.txt`, `cdn-cgi/rum`…) ne renvoient aucun
 * en-tête `Access-Control-Allow-Origin` : le navigateur les bloque en CORS.
 * Ce route les rappelle côté serveur (sans CORS) avec des headers Vidzy
 * whitelistés et renvoie le corps tel quel.
 *
 * Le bootstrap injecté dans le HTML d'embed réécrit `fetch` / `XMLHttpRequest` /
 * `sendBeacon` vers cette route pour tout ce qui n'est PAS du média CDN.
 * Les segments/playlists HLS (ACAO `*`) restent en direct mais sans
 * credentials — voir le bootstrap.
 */

const ALLOWED_HOST = /(^|\.)vidzy\./i;
const REQUEST_TIMEOUT_MS = 10_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ACAO = { "Access-Control-Allow-Origin": "*" };

async function handle(request: NextRequest): Promise<Response> {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return new Response("Paramètre manquant : u", { status: 400, headers: ACAO });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("URL invalide", { status: 400, headers: ACAO });
  }
  if (!/^https?:$/.test(target.protocol) || !ALLOWED_HOST.test(target.hostname)) {
    return new Response("Domaine non autorisé", { status: 403, headers: ACAO });
  }

  // gate.php : le navigateur envoie `ft=<notre origine>` qui n'est pas
  // whitelisté (ok:0). On force les valeurs qui retournent un gk valide.
  if (target.pathname.includes("gate")) {
    target.searchParams.set("ft", "TOP");
    target.searchParams.set("rf", "");
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const headers: Record<string, string> = {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: "https://vidzy.org/",
      Origin: "https://vidzy.org",
    };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    const res = await fetch(target.href, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
      redirect: "follow",
    });

    const buf = await res.arrayBuffer();
    const outType =
      res.headers.get("content-type") ?? "application/octet-stream";
    return new Response(buf, {
      status: res.status,
      headers: {
        "Content-Type": outType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": target.pathname.includes("gate")
          ? "no-store"
          : "public, max-age=300",
      },
    });
  } catch {
    return new Response("Origine indisponible", { status: 502, headers: ACAO });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Preflight CORS (ex. `cdn-cgi/rum` en POST avec Content-Type custom) :
// sans OPTIONS + ACAO, le navigateur échoue avant même d'atteindre le proxy.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}

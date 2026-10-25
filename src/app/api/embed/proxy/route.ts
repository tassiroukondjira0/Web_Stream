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
const MAX_REQUEST_BYTES = 1_000_000;
const MAX_RESPONSE_BYTES = 4_000_000;
const MAX_REDIRECTS = 3;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ACAO = { "Access-Control-Allow-Origin": "*" };

async function readLimited(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<ArrayBuffer | null> {
  if (!stream) return new ArrayBuffer(0);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer as ArrayBuffer;
}

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
  if (target.protocol !== "https:" || target.username || target.password || !ALLOWED_HOST.test(target.hostname)) {
    return new Response("Domaine non autorisé", { status: 403, headers: ACAO });
  }

  // gate.php : le navigateur envoie `ft=<notre origine>` qui n'est pas
  // whitelisté (ok:0). On force les valeurs qui retournent un gk valide.
  if (target.pathname.includes("gate")) {
    target.searchParams.set("ft", "TOP");
    target.searchParams.set("rf", "");
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return new Response("Requête trop volumineuse", { status: 413, headers: ACAO });
  const body = hasBody ? await readLimited(request.body, MAX_REQUEST_BYTES) : undefined;
  if (body === null) return new Response("Requête trop volumineuse", { status: 413, headers: ACAO });

  try {
    const headers: Record<string, string> = {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: "https://vidzy.org/",
      Origin: "https://vidzy.org",
    };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    let current = target;
    let res: Response | undefined;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
      if (current.protocol !== "https:" || !ALLOWED_HOST.test(current.hostname)) {
        return new Response("Redirection non autorisée", { status: 403, headers: ACAO });
      }
      res = await fetch(current.href, {
        method: request.method,
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
        redirect: "manual",
      });
      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) return new Response("Redirection refusée", { status: 502, headers: ACAO });
      current = new URL(location, current);
    }
    if (!res) return new Response("Origine indisponible", { status: 502, headers: ACAO });

    const declaredLength = Number(res.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) return new Response("Réponse trop volumineuse", { status: 502, headers: ACAO });

    const buf = await readLimited(res.body, MAX_RESPONSE_BYTES);
    if (buf === null) return new Response("Réponse trop volumineuse", { status: 502, headers: ACAO });
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

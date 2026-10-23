import { NextRequest } from "next/server";
import net from "node:net";
import tls from "node:tls";
import {
  EMBED_USER_AGENT,
  isAllowedProxyUrl,
  isExternalEmbedHost,
  isRuntimeHost,
  partnerReferer,
} from "@/lib/embed-ext";

/**
 * Proxy runtime des embeds externes (`/api/embed/ext`).
 *
 * Deux modes :
 *  - **bridge** (`h` + `p` [+ `q`]) : appel « same-origin » réécrit depuis le
 *    document (ex. `/api/videos/…`) — le chemin relatif est recomposé sur
 *    l'hôte de l'embed puis rejoué ;
 *  - **absolu** (`u`) : ressources/scripts pointant vers l'hébergeur, passés
 *    tels quels.
 *
 * Le transfert se fait sur une socket brute plutôt que `fetch`/`http.request` :
 * plusieurs hébergeurs (filemoon) renvoient à la fois `Content-Length` et
 * `Transfer-Encoding: chunked`, ce que les parseurs stricts (undici, llhttp)
 * rejettent — on décode donc la réponse nous-mêmes.
 *
 * Allowlist stricte (familles d'hébergeurs connus) : pas de relais ouvert.
 */

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const ACAO = { "Access-Control-Allow-Origin": "*" };

interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

/** Décode un corps `Transfer-Encoding: chunked`. */
function decodeChunked(buf: Buffer): Buffer {
  const out: Buffer[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const nl = buf.indexOf("\r\n", pos);
    if (nl < 0) break;
    const size = parseInt(buf.toString("ascii", pos, nl).split(";")[0].trim(), 16);
    if (!Number.isFinite(size) || size < 0) break;
    if (size === 0) break;
    const start = nl + 2;
    const end = Math.min(start + size, buf.length);
    out.push(buf.subarray(start, end));
    pos = end + 2;
  }
  return Buffer.concat(out);
}

/** Requête HTTP/1.1 brute, décodage manuel de la réponse. */
function requestRawOnce(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
): Promise<RawResponse> {
  const isHttps = url.protocol === "https:";
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80;
  const path = url.pathname + url.search;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const sock: net.Socket = isHttps
      ? tls.connect({ host: url.hostname, port, servername: url.hostname })
      : net.connect({ host: url.hostname, port });

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      fn();
    };

    const parse = (): { res: RawResponse; complete: boolean } | null => {
      const full = Buffer.concat(chunks);
      const idx = full.indexOf("\r\n\r\n");
      if (idx < 0) return null;
      const lines = full.toString("latin1", 0, idx).split("\r\n");
      const status = parseInt(lines[0].split(" ")[1] ?? "0", 10);
      const hdrs: Record<string, string> = {};
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].indexOf(":");
        if (c < 0) continue;
        const k = lines[i].slice(0, c).trim().toLowerCase();
        const v = lines[i].slice(c + 1).trim();
        hdrs[k] = hdrs[k] ? `${hdrs[k]}, ${v}` : v;
      }
      const rawBody = full.subarray(idx + 4);
      let bodyOut: Buffer;
      let complete: boolean;
      if (/chunked/i.test(hdrs["transfer-encoding"] ?? "")) {
        bodyOut = decodeChunked(rawBody);
        // Fin de corps chunked : terminaison "0\r\n\r\n".
        complete = /(^|\r\n)0\r\n(?:\r\n)?$/.test(
          rawBody.toString("latin1", Math.max(0, rawBody.length - 8)),
        );
      } else if (hdrs["content-length"]) {
        const len = parseInt(hdrs["content-length"], 10);
        complete = rawBody.length >= len;
        bodyOut = Number.isFinite(len) ? rawBody.subarray(0, len) : rawBody;
      } else {
        bodyOut = rawBody;
        complete = false;
      }
      return { res: { status, headers: hdrs, body: bodyOut }, complete };
    };

    sock.on("connect", () => {
      let req = `${method} ${path} HTTP/1.1\r\n`;
      req += `Host: ${url.hostname}\r\n`;
      for (const [k, v] of Object.entries(headers)) req += `${k}: ${v}\r\n`;
      if (body) req += `Content-Length: ${body.byteLength}\r\n`;
      req += "Connection: close\r\n\r\n";
      sock.write(req);
      if (body) sock.write(body);
    });

    sock.on("data", (c: Buffer) => {
      chunks.push(c);
      total += c.length;
      if (total > MAX_BODY_BYTES) {
        done(() => reject(new Error("payload too large")));
        return;
      }
      const parsed = parse();
      if (parsed && parsed.complete) {
        done(() => resolve(parsed.res));
      }
    });

    sock.on("end", () => {
      const parsed = parse();
      if (parsed) done(() => resolve(parsed.res));
      else done(() => reject(new Error("réponse vide")));
    });
    sock.on("error", (e) => done(() => reject(e)));
    sock.setTimeout(REQUEST_TIMEOUT_MS, () => done(() => reject(new Error("timeout"))));
  });
}

function toResponse(raw: RawResponse): Response {
  const out: Record<string, string> = {
    "Content-Type": raw.headers["content-type"] ?? "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Cache-Control": "no-store",
  };
  if (raw.headers["set-cookie"]) out["Set-Cookie"] = raw.headers["set-cookie"];
  if (raw.headers["content-range"]) out["Content-Range"] = raw.headers["content-range"];
  if (raw.headers["accept-ranges"]) out["Accept-Ranges"] = raw.headers["accept-ranges"];
  if (raw.headers["content-length"]) out["Content-Length"] = raw.headers["content-length"];
  else out["Content-Length"] = String(raw.body.length);
  return new Response(new Uint8Array(raw.body), { status: raw.status, headers: out });
}

/** Enveloppe une URL de playlist/segment vers notre proxy absolu. */
function playlistProxyUrl(
  raw: string,
  base: URL,
  origin: string,
  contextHost: string | null,
): string | null {
  let abs: URL;
  try {
    abs = new URL(raw, base);
  } catch {
    return null;
  }
  if (abs.protocol !== "http:" && abs.protocol !== "https:") return null;
  const params = new URLSearchParams({ u: abs.href });
  if (contextHost) params.set("h", contextHost);
  return `${origin}/api/embed/ext/proxy?${params.toString()}`;
}

/**
 * Réécrit une playlist HLS : les segments/playlists enfants sont relatifs au
 * manifeste distant, mais le navigateur les résout contre notre URL de proxy
 * (d'où des 404 `/api/embed/ext/seg0.ts`). On les remplace par des URLs
 * absolues de notre proxy afin de conserver l'hôte d'origine.
 */
function rewritePlaylist(
  text: string,
  base: URL,
  origin: string,
  contextHost: string | null,
): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]*)"/g, (m, uri) => {
          const proxied = playlistProxyUrl(uri, base, origin, contextHost);
          return proxied ? `URI="${proxied}"` : m;
        });
      }
      return playlistProxyUrl(trimmed, base, origin, contextHost) ?? line;
    })
    .join("\n");
}

async function forward(
  method: string,
  target: URL,
  referer: string,
  body: Buffer | undefined,
  contentType: string | null,
  range: string | null,
): Promise<Response> {
  let current = target;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!isAllowedProxyUrl(current.href, isRuntimeHost)) {
      return new Response("Domaine non autorisé", { status: 403, headers: ACAO });
    }
    const headers: Record<string, string> = {
      "User-Agent": EMBED_USER_AGENT,
      Accept: "*/*",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      Referer: referer,
      "Accept-Encoding": "identity",
    };
    if (contentType) headers["Content-Type"] = contentType;
    if (range) headers.Range = range;

    const raw = await requestRawOnce(current, method, headers, body);
    if (raw.status >= 300 && raw.status < 400) {
      const loc = raw.headers.location;
      if (!loc) return toResponse(raw);
      try {
        current = new URL(loc, current);
      } catch {
        return new Response("Redirection invalide", { status: 502, headers: ACAO });
      }
      continue;
    }
    return toResponse(raw);
  }
  return new Response("Trop de redirections", { status: 502, headers: ACAO });
}

async function handle(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  const refererPath = sp.get("r");

  // Mode bridge : hôte + chemin relatif (recomposé sur l'hôte de l'embed).
  const host = sp.get("h");
  const path = sp.get("p");
  let target: URL | null = null;
  if (host && path) {
    if (!isExternalEmbedHost(`https://${host}/`) || !path.startsWith("/")) {
      return new Response("Cible non autorisée", { status: 403, headers: ACAO });
    }
    const query = sp.get("q");
    try {
      target = new URL(`https://${host}${path}${query ? `?${query}` : ""}`);
    } catch {
      target = null;
    }
  } else {
    const u = sp.get("u");
    if (u) {
      try {
        target = new URL(u);
      } catch {
        target = null;
      }
    }
  }
  if (!target) {
    return new Response("Paramètre manquant", { status: 400, headers: ACAO });
  }

  // fsvid exige un jeton `gk` (obtenu via /gk) sur les segments au-delà des
  // premières secondes. Le bootstrap l'ajoute à nos URLs proxy ; on le reporte
  // sur l'URL amont.
  const gk = sp.get("gk");
  if (gk && /(^|\.)fsvid\./i.test(target.hostname) && !target.searchParams.has("gk")) {
    target.searchParams.set("gk", gk);
  }

  // Référent transmis à la cible : celui du fournisseur pour les ressources de
  // l'embed, mais un flux externe (sous-domaine CDN/HLS) attend le référent de
  // l'hébergeur du document, pas celui de notre site partenaire.
  const contextHost = host && isExternalEmbedHost(`https://${host}/`) ? host : null;
  const familyBase = contextHost ? contextHost.split(".").slice(-2).join(".") : "";
  const sameFamily =
    !!contextHost &&
    (target.hostname === contextHost || target.hostname.endsWith(`.${familyBase}`));
  const runtime =
    (sameFamily && target.hostname !== contextHost) ||
    (isRuntimeHost(target.hostname) && !isExternalEmbedHost(target.href));
  const referer = runtime
    ? `https://${contextHost ?? target.hostname}/`
    : refererPath
      ? `${partnerReferer()}${refererPath}`
      : partnerReferer();

  if (!isAllowedProxyUrl(target.href, isRuntimeHost)) {
    return new Response("Domaine non autorisé", { status: 403, headers: ACAO });
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  try {
    const response = await forward(
      request.method,
      target,
      referer,
      body,
      request.headers.get("content-type"),
      request.headers.get("range"),
    );
    const contentType = response.headers.get("content-type") ?? "";
    const isPlaylist =
      response.ok &&
      request.method !== "HEAD" &&
      (/mpegurl/i.test(contentType) || /\.m3u8$/i.test(target.pathname));
    if (!isPlaylist) return response;
    const rewritten = rewritePlaylist(
      await response.text(),
      target,
      request.nextUrl.origin,
      contextHost,
    );
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("content-length", String(Buffer.byteLength(rewritten)));
    return new Response(rewritten, { status: response.status, headers });
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
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, X-Requested-With, Range",
      "Access-Control-Max-Age": "86400",
    },
  });
}

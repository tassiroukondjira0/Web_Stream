const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 20_000;

function clientAddress(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && realIp !== "unknown") return realIp.slice(0, 64);
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp && cfConnectingIp !== "unknown") return cfConnectingIp.slice(0, 64);
  const trueClientIp = request.headers.get("true-client-ip")?.trim();
  if (trueClientIp && trueClientIp !== "unknown") return trueClientIp.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    // Sur Render, utiliser l'IP la plus à droite (client d'origine) si possible
    if (chain.length >= 1) {
      const candidate = chain[chain.length - 1];
      if (candidate && !/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|::1|fe80:)/i.test(candidate)) {
        if (/^[0-9a-f:.]+$/i.test(candidate) && candidate.length < 64) return candidate;
      }
      for (let i = chain.length - 1; i >= 0; i--) {
        const ip = chain[i];
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|::1|fe80:)/i.test(ip)) continue;
        if (/^[0-9a-f:.]+$/i.test(ip) && ip.length < 64) return ip;
      }
      return chain[chain.length - 1].slice(0, 64);
    }
  }
  return "unknown";
}

/** Fixed-window per-process limiter; place a platform-wide limiter in front for multi-instance quotas. */
export function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): number | null {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      if (buckets.size >= MAX_BUCKETS) return 10;
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (current.count >= limit) return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  current.count++;
  return null;
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Trop de requêtes. Réessayez plus tard." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

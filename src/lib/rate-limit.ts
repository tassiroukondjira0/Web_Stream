const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 20_000;

function clientAddress(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (chain.length) return chain[0].slice(0, 64);
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

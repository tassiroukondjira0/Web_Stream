import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

let nextRetentionSweepAt = 0;

/**
 * Enregistre une page vue pour les statistiques de trafic admin.
 * Limite anti-bruit : ignore les assets Next, les API et les appels répétés
 * du même visiteur sur la même page à moins de 30 s d'intervalle.
 */
export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(request, "page-track", 60, 60_000);
    if (retryAfter) return tooManyRequests(retryAfter);
    const body = await readRequestBodyLimited(request, 2 * 1024);
    if (!body) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const rawPath = input && typeof input === "object"
      ? (input as Record<string, unknown>).path
      : null;
    if (typeof rawPath !== "string" || !rawPath || rawPath.length > 512) {
      return NextResponse.json({ error: "Chemin requis." }, { status: 400 });
    }
    let pathUrl: URL;
    try {
      pathUrl = new URL(rawPath, "https://tracking.invalid");
    } catch {
      return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
    }
    if (pathUrl.origin !== "https://tracking.invalid") {
      return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
    }
    const path = pathUrl.pathname.replace(/\/{2,}/g, "/").slice(0, 512);
    if (path.startsWith("/_next") || path.startsWith("/api/") || path === "/favicon.ico") {
      return NextResponse.json({ success: true, skipped: true });
    }

    // La base de données n'est pas configurée : on ignore le tracking silencieusement
    // plutôt que de faire planter la requête (ex. Render sans DATABASE_URL).
    if (process.env.DATABASE_READY !== "true") {
      return NextResponse.json({ success: true, skipped: true, reason: "db_not_ready" });
    }

    if (Date.now() >= nextRetentionSweepAt) {
      nextRetentionSweepAt = Date.now() + 24 * 60 * 60_000;
      const retentionCutoff = new Date();
      retentionCutoff.setMonth(retentionCutoff.getMonth() - 13);
      await prisma.pageView.deleteMany({ where: { createdAt: { lt: retentionCutoff } } }).catch(() => {});
    }

    const user = await getCurrentUser().catch(() => null);
    const since = new Date(Date.now() - 30_000);
    if (user) {
      const recent = await prisma.pageView
        .findFirst({
          where: { userId: user.id, path, createdAt: { gte: since } },
          select: { id: true },
        })
        .catch(() => null);
      if (recent) return NextResponse.json({ success: true, skipped: true });
    } else {
      try {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip")?.trim() ||
          "unknown";
        const ua = request.headers.get("user-agent") || "";
        const key = `track:${ip}:${ua.slice(0, 64)}:${path}`;
        const now = Date.now();
        const g = global as any;
        if (!g.__trackCache) g.__trackCache = new Map<string, number>();
        const last = g.__trackCache.get(key);
        if (typeof last === "number" && now - last < 30_000) {
          return NextResponse.json({ success: true, skipped: true });
        }
        g.__trackCache.set(key, now);
        if (g.__trackCache.size > 10000) {
          for (const [k, v] of g.__trackCache) {
            if (now - v > 60_000) g.__trackCache.delete(k);
          }
        }
      } catch {
        // ignore cache errors
      }
    }

    await prisma.pageView.create({
      data: { path, userId: user?.id ?? null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur tracking page :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

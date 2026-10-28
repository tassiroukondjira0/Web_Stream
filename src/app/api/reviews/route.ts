import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || slug.length > 200) {
    return NextResponse.json({ error: "Slug requis." }, { status: 400 });
  }

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json({ reviews: [], average: 0, count: 0 });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { mediaSlug: slug },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const count = reviews.length;
    const average =
      count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    const user = await getCurrentUser().catch(() => null);
    const currentUserReview = user
      ? reviews.find((r) => r.userId === user.id) ?? null
      : null;

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        userName: r.user.name || "Utilisateur",
        isOwn: user?.id === r.userId,
      })),
      average: Math.round(average * 10) / 10,
      count,
      currentUserReview: currentUserReview
        ? {
            id: currentUserReview.id,
            rating: currentUserReview.rating,
            comment: currentUserReview.comment,
          }
        : null,
    });
  } catch (error) {
    console.error("Erreur lecture avis :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  const retryAfter = rateLimit(request, "review-post", 20, 60 * 60_000);
  if (retryAfter) return tooManyRequests(retryAfter);

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json({ error: "Base de données indisponible." }, { status: 503 });
  }

  const body = await readRequestBodyLimited(request, 8 * 1024);
  if (!body) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { slug, rating, comment } = input as Record<string, unknown>;

  if (typeof slug !== "string" || !slug || slug.length > 200) {
    return NextResponse.json({ error: "Slug invalide." }, { status: 400 });
  }
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "Note entre 1 et 5 requise." }, { status: 400 });
  }
  const commentStr =
    typeof comment === "string" ? comment.trim().slice(0, 1000) : null;

  try {
    const review = await prisma.review.upsert({
      where: { userId_mediaSlug: { userId: user.id, mediaSlug: slug } },
      update: { rating: ratingNum, comment: commentStr },
      create: { userId: user.id, mediaSlug: slug, rating: ratingNum, comment: commentStr },
    });
    return NextResponse.json({ success: true, review: { id: review.id } });
  } catch (error) {
    console.error("Erreur enregistrement avis :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Slug requis." }, { status: 400 });
  }

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json({ error: "Base de données indisponible." }, { status: 503 });
  }

  try {
    await prisma.review.delete({
      where: { userId_mediaSlug: { userId: user.id, mediaSlug: slug } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  }
}

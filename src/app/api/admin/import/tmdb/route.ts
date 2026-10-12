import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchPopularMovies,
  fetchPopularTv,
  fetchTvDetails,
  fetchTvSeason,
  tmdbToMediaDraft,
  TMDB_GENRES,
} from "@/lib/tmdb";

// Import de métadonnées depuis TMDB → ébauches de médias dans la base.
// Les fiches importées sont des BROUILLONS (isPublished: false) : elles ne
// seront visibles publiquement qu'après ajout d'une vidéo licenciée + publication.

const MAX_PAGES = 5;
// Plafond de saisons importées par série (limite le nombre d'appels API).
const MAX_SEASONS = 3;

/** Crée/met à jour les catégories de référence et renvoie un index slug → id. */
async function ensureCategories(): Promise<Record<string, string>> {
  const categoryIdBySlug: Record<string, string> = {};
  for (const { name, slug } of Object.values(TMDB_GENRES)) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    categoryIdBySlug[slug] = category.id;
  }
  return categoryIdBySlug;
}

/**
 * Importe les saisons et épisodes d'une série depuis TMDB.
 * Crée/maj les Season (contrainte unique mediaId+seasonNumber) et leurs Episode.
 */
async function importSeriesSeasons(
  mediaId: string,
  seriesId: number
): Promise<{ seasons: number; episodes: number }> {
  let seasonsCount = 0;
  let episodesCount = 0;

  let details;
  try {
    details = await fetchTvDetails(seriesId);
  } catch {
    return { seasons: 0, episodes: 0 };
  }

  const totalSeasons = Math.min(details.number_of_seasons || 0, MAX_SEASONS);

  for (let s = 1; s <= totalSeasons; s++) {
    let season;
    try {
      season = await fetchTvSeason(seriesId, s);
    } catch {
      continue; // Saison indisponible : on passe à la suivante
    }
    if (!season.episodes || season.episodes.length === 0) continue;

    const seasonRecord = await prisma.season.upsert({
      where: { mediaId_seasonNumber: { mediaId, seasonNumber: s } },
      update: { title: season.name || `Saison ${s}` },
      create: {
        mediaId,
        seasonNumber: s,
        title: season.name || `Saison ${s}`,
      },
    });
    seasonsCount++;

    for (const ep of season.episodes) {
      await prisma.episode.upsert({
        where: {
          seasonId_episodeNumber: {
            seasonId: seasonRecord.id,
            episodeNumber: ep.episode_number,
          },
        },
        update: {
          title: ep.name,
          synopsis: ep.overview || null,
          durationMinutes: ep.runtime ?? null,
        },
        create: {
          seasonId: seasonRecord.id,
          episodeNumber: ep.episode_number,
          title: ep.name || `Épisode ${ep.episode_number}`,
          synopsis: ep.overview || null,
          durationMinutes: ep.runtime ?? null,
          videoStreamId: null,
          accessLevel: "FREE",
        },
      });
      episodesCount++;
    }
  }

  return { seasons: seasonsCount, episodes: episodesCount };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 }
    );
  }

  // L'import nécessite une base active.
  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json(
      {
        error: "DB_NOT_READY",
        message: "La base de données n'est pas disponible. Démarrez PostgreSQL avant l'import.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const type: "MOVIE" | "SERIES" = body?.type === "SERIES" ? "SERIES" : "MOVIE";
    const requestedPages = Number(body?.pages) || 1;
    const pages = Math.min(Math.max(requestedPages, 1), MAX_PAGES);

    // 1. S'assurer que toutes les catégories de référence existent.
    const categoryIdBySlug = await ensureCategories();

    // 2. Récupérer les pages TMDB demandées.
    const allResults = [];
    for (let p = 1; p <= pages; p++) {
      const data = type === "SERIES" ? await fetchPopularTv(p) : await fetchPopularMovies(p);
      allResults.push(...data.results);
    }

    // 3. Créer les médias en brouillon (upsert sur le slug, jamais de republication auto).
    let created = 0;
    let updated = 0;
    let seasonsImported = 0;
    let episodesImported = 0;
    const usedSlugs = new Set<string>();

    for (const item of allResults) {
      const draft = tmdbToMediaDraft(item, type);

      // Garantit l'unicité du slug en cas de titres identiques sur une même page.
      let slug = draft.slug;
      while (usedSlugs.has(slug)) slug = `${draft.slug}-${item.id}`;
      usedSlugs.add(slug);

      const categoryConnections = draft.categorySlugs
        .map((s) => categoryIdBySlug[s])
        .filter(Boolean)
        .map((id) => ({ category: { connect: { id } } }));

      const existing = await prisma.media.findUnique({ where: { slug } });

      if (existing) {
        // Met à jour les métadonnées sans toucher à la vidéo ni à l'état de publication.
        await prisma.media.update({
          where: { slug },
          data: {
            title: draft.title,
            synopsis: draft.synopsis,
            type,
            releaseYear: draft.releaseYear,
            posterUrl: draft.posterUrl,
            backdropUrl: draft.backdropUrl,
          },
        });
        updated++;

        // Complète aussi les saisons si c'est une série et qu'elle n'en a pas encore.
        if (type === "SERIES") {
          const seasonCount = await prisma.season.count({ where: { mediaId: existing.id } });
          if (seasonCount === 0) {
            const res = await importSeriesSeasons(existing.id, item.id);
            seasonsImported += res.seasons;
            episodesImported += res.episodes;
          }
        }
      } else {
        const media = await prisma.media.create({
          data: {
            title: draft.title,
            slug,
            synopsis: draft.synopsis,
            type,
            accessLevel: draft.accessLevel,
            releaseYear: draft.releaseYear,
            durationMinutes: draft.durationMinutes,
            posterUrl: draft.posterUrl,
            backdropUrl: draft.backdropUrl,
            videoStreamId: null,
            isPublished: false, // Brouillon : en attente d'une vidéo licenciée
            rightsValidUntil: null,
            categories: { create: categoryConnections },
          },
        });
        created++;

        // Pour une série, importe immédiatement ses saisons et épisodes.
        if (type === "SERIES") {
          const res = await importSeriesSeasons(media.id, item.id);
          seasonsImported += res.seasons;
          episodesImported += res.episodes;
        }
      }
    }

    const seriesNote =
      type === "SERIES"
        ? ` ${seasonsImported} saison(s) et ${episodesImported} épisode(s) importé(s).`
        : "";

    return NextResponse.json({
      success: true,
      message: `Import TMDB terminé : ${created} fiche(s) créée(s), ${updated} mise(s) à jour.${seriesNote} Les fiches sont en brouillon en attente d'une vidéo licenciée.`,
      stats: {
        created,
        updated,
        seasons: seasonsImported,
        episodes: episodesImported,
        scanned: allResults.length,
        pages,
        type,
      },
    });
  } catch (error) {
    console.error("Erreur import TMDB :", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Erreur inconnue lors de l'import TMDB.",
      },
      { status: 500 }
    );
  }
}

/**
 * Importation ciblée d'un titre depuis TMDB.
 *
 * Usage :
 *   npx tsx prisma/import-targeted.ts "Naruto" --type SERIES
 *   npx tsx prisma/import-targeted.ts "Naruto Shippuden" --type SERIES
 *   npx tsx prisma/import-targeted.ts "Dragon Ball Z" --type SERIES
 *   npx tsx prisma/import-targeted.ts "Le Seigneur des Anneaux" --type MOVIE
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  fetchTvDetails,
  fetchTvSeason,
  tmdbToMediaDraft,
  TMDB_GENRES,
  slugify,
  hasTmdbCredentials,
} from "@/lib/tmdb";
import type { TmdbMovie, TmdbTvDetails, TmdbSeason } from "@/lib/tmdb";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const MAX_SEASONS = 20; // limite pour éviter les imports trop lourds

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_API_TOKEN;
  const key = process.env.TMDB_API_KEY;

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const headers: Record<string, string> = { accept: "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (key) {
    url.searchParams.set("api_key", key);
  } else {
    throw new Error("Authentification TMDB manquante.");
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB a répondu ${res.status} : ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface TmdbSearchItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  vote_average: number;
}

interface TmdbSearchResponse {
  results: TmdbSearchItem[];
}

async function searchTmdb(query: string, type: "movie" | "tv"): Promise<TmdbSearchItem | null> {
  const data = await tmdbFetch<TmdbSearchResponse>("/search/multi", {
    query,
    include_adult: "false",
  });

  // Filtre par type et prend le meilleur résultat
  const results = (data.results ?? []).filter(
    (r) => r.media_type === type
  );

  return results[0] ?? null;
}

async function ensureCategory(slug: string, name: string): Promise<string> {
  return (await prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  })).id;
}

async function importSeriesSeasons(
  mediaId: string,
  seriesId: number
): Promise<{ seasons: number; episodes: number }> {
  let seasonsCount = 0;
  let episodesCount = 0;

  let details: TmdbTvDetails;
  try {
    details = await fetchTvDetails(seriesId);
  } catch {
    console.log("  ⚠ Impossible de récupérer les détails de la série.");
    return { seasons: 0, episodes: 0 };
  }

  const totalSeasons = Math.min(details.number_of_seasons || 0, MAX_SEASONS);
  console.log(`  📺 ${totalSeasons} saison(s) à importer (sur ${details.number_of_seasons} au total)...`);

  for (let s = 1; s <= totalSeasons; s++) {
    let season: TmdbSeason;
    try {
      console.log(`    Saison ${s}...`);
      season = await fetchTvSeason(seriesId, s);
    } catch {
      console.log(`    ⚠ Saison ${s} indisponible, passage à la suivante.`);
      continue;
    }
    if (!season.episodes || season.episodes.length === 0) {
      console.log(`    ⚠ Saison ${s} sans épisodes.`);
      continue;
    }

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
          videoUrl: null,
          accessLevel: "FREE",
        },
      });
      episodesCount++;
    }
  }

  return { seasons: seasonsCount, episodes: episodesCount };
}

async function main() {
  const args = process.argv.slice(2);
  const title = args[0];

  if (!title) {
    console.log('Usage: npx tsx prisma/import-targeted.ts "Titre" --type SERIES|MOVIE');
    process.exit(1);
  }

  const typeIndex = args.indexOf("--type");
  const type = (typeIndex !== -1 ? args[typeIndex + 1] : "SERIES").toUpperCase() as "SERIES" | "MOVIE";
  const kind: "movie" | "tv" = type === "MOVIE" ? "movie" : "tv";

  console.log(`\n🔍 Recherche de "${title}" sur TMDB (${type})...\n`);

  if (!hasTmdbCredentials()) {
    console.error("❌ Credentials TMDB non configurés.");
    process.exit(1);
  }

  // 1. Recherche sur TMDB
  const searchResult = await searchTmdb(title, kind);
  if (!searchResult) {
    console.error(`❌ Aucun résultat trouvé pour "${title}" sur TMDB.`);
    process.exit(1);
  }

  console.log(`✅ Trouvé : ${searchResult.title ?? searchResult.name} (TMDB ID: ${searchResult.id})`);
  console.log(`   Score: ${searchResult.vote_average}/10`);
  console.log();

  // 2. Vérifie si le média existe déjà
  const rawTitle = searchResult.title ?? searchResult.name ?? title;
  const slug = slugify(rawTitle);
  const existing = await prisma.media.findUnique({ where: { slug } });

  if (existing) {
    console.log(`⚠ Le média existe déjà avec le slug "${existing.slug}".`);
    console.log(`   ID: ${existing.id}`);

    // Complète les saisons si c'est une série sans saisons
    if (type === "SERIES") {
      const seasonCount = await prisma.season.count({ where: { mediaId: existing.id } });
      if (seasonCount === 0) {
        console.log(`   Import des saisons et épisodes...`);
        const res = await importSeriesSeasons(existing.id, searchResult.id);
        console.log(`   ✅ ${res.seasons} saison(s) et ${res.episodes} épisode(s) importé(s).`);
      } else {
        console.log(`   ✅ ${seasonCount} saison(s) déjà présentes.`);
      }
    }

    console.log(`\n✅ Import terminé : média existant mis à jour.`);
    return;
  }

  // 3. Construit le draft du média
  const draft = tmdbToMediaDraft(searchResult as any, type);

  // 4. Crée les catégories
  const categoryIds: string[] = [];
  for (const catSlug of draft.categorySlugs) {
    const genre = Object.entries(TMDB_GENRES).find(([, v]) => v.slug === catSlug);
    if (genre) {
      const catId = await ensureCategory(catSlug, genre[1].name);
      categoryIds.push(catId);
    }
  }

  // Ajoute la catégorie "animation" pour les animes
  if (!draft.categorySlugs.includes("animation")) {
    // On vérifie si TMDB a déjà le genre animation (16)
    if (searchResult.genre_ids?.includes(16)) {
      const catId = await ensureCategory("animation", "Animation");
      if (!categoryIds.includes(catId)) categoryIds.push(catId);
    }
  }

  // 5. Crée le média
  console.log(`📝 Création du média...`);
  const media = await prisma.media.create({
    data: {
      title: draft.title,
      slug: draft.slug,
      synopsis: draft.synopsis,
      type: type as any,
      accessLevel: "FREE",
      releaseYear: draft.releaseYear,
      durationMinutes: draft.durationMinutes,
      posterUrl: draft.posterUrl,
      backdropUrl: draft.backdropUrl,
      videoUrl: null,
      isPublished: true, // Publié directement pour l'import ciblée
      rightsValidUntil: null,
      categories: {
        create: categoryIds.map((id) => ({
          category: { connect: { id } },
        })),
      },
    },
  });

  console.log(`✅ Média créé : "${media.title}" (slug: ${media.slug})`);

  // 6. Importe les saisons et épisodes pour les séries
  if (type === "SERIES") {
    console.log();
    const res = await importSeriesSeasons(media.id, searchResult.id);
    console.log(`\n✅ ${res.seasons} saison(s) et ${res.episodes} épisode(s) importé(s).`);
  }

  console.log(`\n🎉 Import de "${title}" terminé avec succès !`);
  console.log(`   Slug: ${media.slug}`);
  console.log(`   URL: /${type === "MOVIE" ? "films" : "series"}/${media.slug}`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});

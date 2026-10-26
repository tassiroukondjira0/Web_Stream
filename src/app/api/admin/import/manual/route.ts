import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";

/**
 * Import manuel de titres depuis un fichier JSON ou CSV (upload ou body JSON).
 *
 * Format JSON attendu (tableau) :
 *   [
 *     {
 *       "title": "Le Chant de la Forêt",
 *       "synopsis": "Résumé...",
 *       "type": "MOVIE" | "SERIES",
 *       "releaseYear": 2024,
 *       "durationMinutes": 120,
 *       "posterUrl": "https://...",
 *       "backdropUrl": "https://...",
 *       "videoUrl": "https://... (fichier vidéo ou playlist HLS sous licence)",
 *       "accessLevel": "FREE" | "PREMIUM",
 *       "categories": ["action", "drame"]
 *     }
 *   ]
 *
 * Format CSV attendu (en-tête + lignes) :
 *   title,synopsis,type,releaseYear,durationMinutes,posterUrl,backdropUrl,videoUrl,accessLevel,categories
 *   "Le Chant de la Forêt","Résumé...",MOVIE,2024,120,https://...,https://...,https://...,FREE,action,drame
 *
 * Anti-doublon : vérifie par titre + année (et par slug s'il est fourni).
 * Les fiches sont créées en brouillon (isPublished: false).
 */

const MAX_IMPORT = 200; // garde-fou pour éviter les imports massifs accidentels
const MAX_IMPORT_BODY_BYTES = 5 * 1024 * 1024;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

async function ensureCategory(slug: string, name: string): Promise<string> {
  return (await prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  })).id;
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 },
    );
  }

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json(
      { error: "DB_NOT_READY", message: "Base de données indisponible." },
      { status: 503 },
    );
  }

  let items: unknown[] = [];
  const rawBody = await readRequestBodyLimited(request, MAX_IMPORT_BODY_BYTES);
  if (!rawBody) {
    return NextResponse.json({ error: "Fichier trop volumineux (5 Mo maximum)." }, { status: 413 });
  }
  if (rawBody.byteLength > MAX_IMPORT_BODY_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (5 Mo maximum)." }, { status: 413 });
  }
  const bufferedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: Buffer.from(rawBody),
  });

  // Détecte le type de requête : multipart (fichier) ou JSON pur.
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  if (isMultipart) {
    const formData = await bufferedRequest.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "NO_FILE", message: "Aucun fichier fourni (champ 'file')." },
        { status: 400 },
      );
    }
    const text = await file.text();
    const name = file.name.toLowerCase();

    if (name.endsWith(".json")) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        items = parsed;
      } catch {
        return NextResponse.json({ error: "Fichier JSON invalide." }, { status: 400 });
      }
    } else if (name.endsWith(".csv")) {
      items = parseCsv(text);
    } else {
      return NextResponse.json(
        { error: "BAD_FORMAT", message: "Format non supporté : utilisez .json ou .csv." },
        { status: 400 },
      );
    }
  } else {
    // Body JSON direct.
    const body: unknown = await bufferedRequest.json().catch(() => null);
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "BAD_BODY", message: "Le corps doit être un tableau JSON d'objets." },
        { status: 400 },
      );
    }
    items = body;
  }

  if (!items.length) {
    return NextResponse.json(
      { error: "EMPTY", message: "Aucun titre à importer." },
      { status: 400 },
    );
  }

  if (items.length > MAX_IMPORT) {
    return NextResponse.json(
      { error: "TOO_MANY", message: `Maximum ${MAX_IMPORT} titres par import.` },
      { status: 400 },
    );
  }

  let created = 0;
  const updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i] && typeof items[i] === "object"
      ? (items[i] as Record<string, unknown>)
      : {};
    const line = i + 1;

    try {
      const title = typeof raw.title === "string" ? raw.title.trim() : "";
      if (!title) {
        errors.push(`Ligne ${line} : titre manquant`);
        continue;
      }

      const synopsis = typeof raw.synopsis === "string" ? raw.synopsis.trim() : "";
      const type: "MOVIE" | "SERIES" = raw.type === "SERIES" ? "SERIES" : "MOVIE";
      const releaseYear: number = Number.parseInt(String(raw.releaseYear ?? 0), 10) || new Date().getFullYear();
      const durationMinutes: number | null =
        raw?.durationMinutes != null ? Number.parseInt(String(raw.durationMinutes), 10) || null : null;
      const posterUrl = typeof raw.posterUrl === "string" ? raw.posterUrl : null;
      const backdropUrl = typeof raw.backdropUrl === "string" ? raw.backdropUrl : null;
      const videoUrl = typeof raw.videoUrl === "string" ? raw.videoUrl : null;
      const accessLevel: "FREE" | "PREMIUM" = raw.accessLevel === "PREMIUM" ? "PREMIUM" : "FREE";
      const categorySlugs: string[] = Array.isArray(raw?.categories)
        ? raw.categories.filter((s): s is string => typeof s === "string")
        : raw?.categories
          ? String(raw.categories).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          : [];

      const slug: string = (typeof raw.slug === "string" ? raw.slug.trim() : "") || slugify(title);

      // Anti-doublon : titre + année (et slug si présent).
      const existingBySlug = await prisma.media.findUnique({ where: { slug } });
      const existingByTitleYear = await prisma.media.findFirst({
        where: { title, releaseYear },
      });
      const existing = existingBySlug ?? existingByTitleYear;

      if (existing) {
        skipped++;
        continue;
      }

      // Crée / met à jour les catégories.
      const categoryConnections = [];
      for (const catSlug of categorySlugs) {
        const catName = catSlug.charAt(0).toUpperCase() + catSlug.slice(1);
        const catId = await ensureCategory(catSlug, catName);
        categoryConnections.push({ category: { connect: { id: catId } } });
      }

      await prisma.media.create({
        data: {
          title,
          slug,
          synopsis,
          type,
          accessLevel,
          releaseYear,
          durationMinutes,
          posterUrl,
          backdropUrl,
          videoUrl,
          isPublished: false, // brouillon : l'admin publiera après ajout de vidéo
          rightsValidUntil: null,
          categories: { create: categoryConnections },
        },
      });
      created++;
    } catch (err) {
      errors.push(`Ligne ${line} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Import manuel terminé : ${created} créé(s), ${updated} mis à jour, ${skipped} doublon(s) ignoré(s).`,
    stats: { created, updated, skipped, total: items.length, errors: errors.length },
    errors: errors.slice(0, 20), // limite la liste d'erreurs renvoyée
  });
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const items: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < header.length) continue;

    const get = (name: string) => {
      const j = idx(name);
      return j >= 0 ? fields[j]?.trim() : undefined;
    };

    const categoriesRaw = get("categories") ?? "";
    const categories = categoriesRaw ? categoriesRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];

    items.push({
      title: get("title"),
      synopsis: get("synopsis"),
      type: get("type"),
      releaseYear: get("releaseYear"),
      durationMinutes: get("durationMinutes"),
      posterUrl: get("posterUrl"),
      backdropUrl: get("backdropUrl"),
      videoUrl: get("videoUrl"),
      accessLevel: get("accessLevel"),
      categories,
    });
  }
  return items;
}

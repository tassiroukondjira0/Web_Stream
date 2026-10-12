import type { MetadataRoute } from "next";
import { getAllMedias } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const medias = await getAllMedias();

  // Pages statiques principales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/films`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/series`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/nouveautes`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/premium`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Pages dynamiques des films publiables
  const filmPages: MetadataRoute.Sitemap = medias
    .filter((m) => m.type === "MOVIE" && m.isPublished)
    .map((film) => ({
      url: `${baseUrl}/films/${film.slug}`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  return [...staticPages, ...filmPages];
}

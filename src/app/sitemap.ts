import type { MetadataRoute } from "next";
import { getAllMedias } from "@/lib/catalog";
import { getAppUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();
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
      priority: 0.9,
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
    {
      url: `${baseUrl}/conditions`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/confidentialite`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Pages dynamiques des films et séries publiables
  const dynamicPages: MetadataRoute.Sitemap = medias
    .filter((m) => m.isPublished)
    .map((item) => ({
      url: item.type === "MOVIE" ? `${baseUrl}/films/${item.slug}` : `${baseUrl}/series/${item.slug}`,
      lastModified: new Date("2026-10-12"),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  return [...staticPages, ...dynamicPages];
}

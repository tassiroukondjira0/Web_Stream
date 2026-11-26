import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getAppUrl } from "@/lib/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const baseUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/films", "/films/", "/series", "/series/", "/nouveautes"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/mon-compte",
          "/mon-compte/",
          "/connexion",
          "/inscription",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

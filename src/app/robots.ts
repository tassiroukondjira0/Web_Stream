import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
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

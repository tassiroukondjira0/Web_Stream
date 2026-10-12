import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

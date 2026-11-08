import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * Racine explicite du projet. Sans cela, Turbopack remonte l'arborescence à la
 * recherche d'un lockfile et peut tomber sur un `package-lock.json` situé
 * ailleurs (ex. dossier utilisateur), ce qui déclenche :
 * « Warning: Next.js ignored package-lock.json … outside the current Git repository ».
 */
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client", "prisma"],
  webpack: (config) => {
    config.externals = [...(config.externals || []), "pg", "@prisma/adapter-pg"];
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/p/**",
      },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
          {
            key: "Permissions-Policy",
            // `light-sensor` n'est pas une directive reconnue par Chrome :
            // sa présence déclenche �� Unrecognized feature �� dans la console.
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https: blob:",
              "script-src-elem 'self' 'unsafe-inline' https: blob:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https: blob:",
              "connect-src 'self' https: blob:",
              "frame-src 'self' https:",
              "font-src 'self' data: https:",
              "object-src 'none'",
              "base-uri 'self' https:",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Le CDN Vidzy renvoie 403 sur les playlists/segments dont le
        // `Referer` n'appartient pas à un domaine Vidzy (y compris le nôtre).
        // On supprime donc le référant du document d'embed uniquement ; les
        // autres routes conservent la politique globale.
        source: "/api/embed/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;

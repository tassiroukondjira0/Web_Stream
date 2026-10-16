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
            // Seules les fonctionnalités reconnues par les navigateurs sont listées.
            // Les fonctionnalités "Privacy Sandbox" (attribution-reporting,
            // private-aggregation, join-ad-interest-group, run-ad-auction,
            // browsing-topics) sont volontairement exclues pour éviter les
            // avertissements "Unrecognized feature" dans la console DevTools.
            key: "Permissions-Policy",
            value:
              "accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), picture-in-picture=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

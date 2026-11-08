import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Le chemin vers build-metadata.json — stocké dans le dépôt Web_Stream
const BUILD_META_PATH = path.join(process.cwd(), 'build-metadata.json');

/**
 * Endpoint public qui retourne les informations du dernier build disponible.
 * Utilisé par l'application mobile pour détecter les mises à jour.
 * Ne nécessite pas d'authentification — accessible par tous les utilisateurs.
 */
export async function GET() {
  try {
    // Lire le build EAS cloud depuis build-metadata.json
    let easBuild: { buildDate: string; downloadUrl: string } | null = null;
    if (fs.existsSync(BUILD_META_PATH)) {
      try {
        const meta = JSON.parse(fs.readFileSync(BUILD_META_PATH, 'utf-8'));
        if (meta?.eas) {
          easBuild = meta.eas;
        }
      } catch {
        // Ignore — fichier corrompu ou inexistant
      }
    }

    // Lire le build local depuis le dossier apk/
    const APK_DIR = path.join(process.cwd(), 'apk');
    let localBuild: { buildDate: string; size: number } | null = null;
    if (fs.existsSync(APK_DIR)) {
      const files = fs.readdirSync(APK_DIR).filter((f) => f.endsWith('.apk'));
      if (files.length > 0) {
        const apkPath = path.join(APK_DIR, files[0]);
        const stat = fs.statSync(apkPath);
        localBuild = {
          buildDate: stat.mtime.toISOString(),
          size: stat.size,
        };
      }
    }

    // Comparer les deux builds et retourner le plus récent
    let latest: { type: 'eas' | 'local'; buildDate: string; downloadUrl: string; size?: number } | null = null;

    if (easBuild && localBuild) {
      if (new Date(easBuild.buildDate).getTime() >= new Date(localBuild.buildDate).getTime()) {
        latest = { type: 'eas', buildDate: easBuild.buildDate, downloadUrl: easBuild.downloadUrl };
      } else {
        latest = { type: 'local', buildDate: localBuild.buildDate, downloadUrl: '/api/app-apk/download', size: localBuild.size };
      }
    } else if (easBuild) {
      latest = { type: 'eas', buildDate: easBuild.buildDate, downloadUrl: easBuild.downloadUrl };
    } else if (localBuild) {
      latest = { type: 'local', buildDate: localBuild.buildDate, downloadUrl: '/api/app-apk/download', size: localBuild.size };
    }

    return NextResponse.json({
      hasNewBuild: latest !== null,
      latestBuild: latest,
    });
  } catch (error) {
    console.error('latest-build error:', error);
    return NextResponse.json({ hasNewBuild: false, latestBuild: null }, { status: 500 });
  }
}

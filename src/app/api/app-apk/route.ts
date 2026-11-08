import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Chemin vers le dossier de build APK local
const APK_BUILD_DIR = path.join(
  process.cwd(),
  '..',
  'Web_Stream_Mobile',
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
);

// Fichier de métadonnées des builds (mis à jour par EAS webhook et builds locaux)
const BUILD_META_PATH = path.join(
  process.cwd(),
  '..',
  'Web_Stream_Mobile',
  'build-metadata.json',
);

interface BuildInfo {
  type: 'local' | 'eas';
  buildDate: string;
  size: number;
  downloadUrl: string;
}

function findLatestLocalApk(): BuildInfo | null {
  if (!fs.existsSync(APK_BUILD_DIR)) {
    return null;
  }

  const files = fs.readdirSync(APK_BUILD_DIR);
  const apkFiles = files
    .map((f) => ({
      name: f,
      fullPath: path.join(APK_BUILD_DIR, f),
    }))
    .filter(({ fullPath }) => fs.statSync(fullPath).isFile());

  if (apkFiles.length === 0) {
    return null;
  }

  apkFiles.sort((a, b) => {
    const statA = fs.statSync(a.fullPath);
    const statB = fs.statSync(b.fullPath);
    return statB.mtimeMs - statA.mtimeMs;
  });

  const latest = apkFiles[0];
  const stat = fs.statSync(latest.fullPath);

  return {
    type: 'local',
    buildDate: stat.mtime.toISOString(),
    size: stat.size,
    downloadUrl: '/api/app-apk/download',
  };
}

function findLatestEasBuild(): BuildInfo | null {
  if (!fs.existsSync(BUILD_META_PATH)) {
    return null;
  }

  try {
    const meta = JSON.parse(fs.readFileSync(BUILD_META_PATH, 'utf-8'));
    if (meta?.eas?.buildDate && meta?.eas?.downloadUrl) {
      return {
        type: 'eas',
        buildDate: meta.eas.buildDate,
        size: meta.eas.size ?? 0,
        downloadUrl: meta.eas.downloadUrl,
      };
    }
  } catch {
    // Fichier corrompu, ignoré
  }
  return null;
}

// GET — retourne les deux builds triés par date (le plus récent en premier)
export async function GET() {
  try {
    const local = findLatestLocalApk();
    const eas = findLatestEasBuild();

    const builds: BuildInfo[] = [];
    if (local) builds.push(local);
    if (eas) builds.push(eas);

    // Trier par date de build (le plus récent en premier)
    builds.sort((a, b) => new Date(b.buildDate).getTime() - new Date(a.buildDate).getTime());

    return NextResponse.json({ builds }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error finding builds:', error);
    return NextResponse.json(
      { builds: [] },
      { status: 500 },
    );
  }
}

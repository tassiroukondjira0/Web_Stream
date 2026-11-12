import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '@/lib/prisma';

// Chemin vers le dossier APK versionné dans le dépôt
const APK_BUILD_DIR = path.join(process.cwd(), 'apk');

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

async function findLatestEasBuild(): Promise<BuildInfo | null> {
  try {
    const buildInfo = await prisma.buildInfo.findFirst({
      orderBy: { updatedAt: 'desc' },
      where: { platform: 'android' },
      select: {
        buildUrl: true,
        artifactUrl: true,
        updatedAt: true,
      },
    });

    if (buildInfo?.buildUrl) {
      return {
        type: 'eas',
        buildDate: buildInfo.updatedAt.toISOString(),
        size: 0,
        downloadUrl: buildInfo.artifactUrl || buildInfo.buildUrl,
      };
    }
  } catch (error) {
    console.error('Error fetching EAS build from database:', error);
  }
  return null;
}

// GET — retourne les deux builds triés par date (le plus récent en premier)
export async function GET() {
  try {
    const local = findLatestLocalApk();
    const eas = await findLatestEasBuild();

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

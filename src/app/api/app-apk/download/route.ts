import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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

function findLatestApk(): { path: string; name: string } | null {
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
  return { path: latest.fullPath, name: latest.name };
}

export async function GET() {
  const apk = findLatestApk();

  if (!apk) {
    return NextResponse.json(
      { error: 'Aucun build local trouvé' },
      { status: 404 },
    );
  }

  const stat = fs.statSync(apk.path);
  const fileStream = fs.createReadStream(apk.path);

  return new NextResponse(fileStream as any, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${apk.name}"`,
      'Content-Length': String(stat.size),
    },
  });
}

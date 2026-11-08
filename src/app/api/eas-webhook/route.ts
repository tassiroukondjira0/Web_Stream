import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '@/lib/prisma';

// Le chemin vers build-metadata.json — stocké dans le dépôt Web_Stream pour être accessible sur Render
const BUILD_META_PATH = path.join(process.cwd(), 'build-metadata.json');

interface EasBuildPayload {
  id: string;
  accountName: string;
  projectName: string;
  platform: 'android' | 'ios';
  status: 'new' | 'inQueue' | 'running' | 'finished' | 'errored' | 'canceled';
  buildProfile?: string;
  message?: string;
  applicationIdentifier?: string;
  gitCommitHash?: string;
  gitMessage?: string;
  sdkVersion?: string;
  buildUrl?: string;
  // Les champs ci-dessous peuvent varier selon la version EAS
  [key: string]: unknown;
}

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) {
    console.warn('[EAS Webhook] Missing Expo-Signature header');
    return false;
  }

  const expected = crypto
    .createHmac('sha1', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function writeBuildMetadata(buildUrl: string, buildDate: string): void {
  const meta = {
    eas: {
      buildDate,
      downloadUrl: buildUrl,
      size: 0,
    },
  };

  // Créer le dossier s'il n'existe pas
  const dir = path.dirname(BUILD_META_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
  console.log('[EAS Webhook] build-metadata.json updated:', buildUrl);
}

export async function POST(request: NextRequest) {
  const secret = process.env.EAS_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[EAS Webhook] EAS_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Lire le raw body pour la vérification de signature
  const rawBody = await request.text();
  const signature = request.headers.get('expo-signature');

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('[EAS Webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: EasBuildPayload;
  try {
    payload = JSON.parse(rawBody) as EasBuildPayload;
  } catch {
    console.error('[EAS Webhook] Failed to parse payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // On s'intéresse uniquement aux builds Android terminés
  if (payload.platform !== 'android') {
    return NextResponse.json({ ignored: true, reason: 'non-android platform' }, { status: 200 });
  }

  if (payload.status !== 'finished') {
    return NextResponse.json({ ignored: true, reason: `status is ${payload.status}` }, { status: 200 });
  }

  // Construire l'URL de téléchargement depuis les données du payload
  // EAS fournit l'URL du build dans buildUrl ou on la reconstruit
  const buildUrl = payload.buildUrl ??
    `https://expo.dev/accounts/${payload.accountName}/projects/${payload.projectName}/builds/${payload.id}`;

  const buildDate = new Date().toISOString();

  try {
    writeBuildMetadata(buildUrl, buildDate);
    console.log('[EAS Webhook] Build finished:', payload.id, 'Profile:', payload.buildProfile);

    // Créer une notification "Nouveau build disponible" pour tous les utilisateurs connectés
    try {
      const users = await prisma.user.findMany({ select: { id: true } });
      if (users.length > 0) {
        await prisma.notification.createMany({
          data: users.map((user) => ({
            userId: user.id,
            title: 'Mise à jour disponible',
            message: 'Une nouvelle mise à jour est disponible.',
            link: '/download',
            type: 'BUILD_UPDATE',
          })),
        });
        console.log(`[EAS Webhook] Notifications créées pour ${users.length} utilisateur(s)`);
      }
    } catch (notifError: unknown) {
      console.error('[EAS Webhook] Failed to create notifications:', notifError);
      // Ne pas échouer le webhook si les notifications échouent
    }

    return NextResponse.json({
      success: true,
      buildId: payload.id,
      buildUrl,
      buildDate,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('[EAS Webhook] Failed to write metadata:', error);
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 });
  }
}

// GET — pour tester que le webhook est accessible
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'EAS Webhook endpoint is active',
    configured: !!process.env.EAS_WEBHOOK_SECRET,
  }, { status: 200 });
}

import { SignJWT } from "jose";

/**
 * Utilitaire d'intégration avec l'API Cloudflare Stream (Phase 05)
 * - Création d'URLs de téléversement direct (Direct Creator Upload via TUS)
 * - Signature de jetons de lecture restreints (Signed URL / Tokens)
 */

interface CloudflareSignedTokenOptions {
  videoUid: string;
  expiresInSeconds?: number;
  userId?: string;
}

export async function generateCloudflareSignedToken({
  videoUid,
  expiresInSeconds = 7200, // 2 heures par défaut
  userId,
}: CloudflareSignedTokenOptions): Promise<string> {
  const pemKey = process.env.CLOUDFLARE_STREAM_JWK_KEY || "dummy_jwt_private_key_signature";
  const keyId = process.env.CLOUDFLARE_STREAM_PEM_KEY_ID || "dummy_key_id";

  const secret = new TextEncoder().encode(pemKey);

  return new SignJWT({
    sub: videoUid,
    kid: keyId,
    userId: userId || "anonymous",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret);
}

export function buildPlaybackUrl(videoUid: string, token?: string): string {
  const accountCustomerDomain =
    process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN || "customer-sample.cloudflarestream.com";

  if (token) {
    return `https://${accountCustomerDomain}/${token}/manifest/video.m3u8`;
  }
  return `https://${accountCustomerDomain}/${videoUid}/manifest/video.m3u8`;
}

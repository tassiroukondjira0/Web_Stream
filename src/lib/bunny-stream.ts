import { createHmac } from "crypto";

/**
 * Utilitaire d'intégration avec Bunny.net Stream
 *
 * Documentation officielle :
 * - API vidéo     : https://docs.bunny.net/reference/video_getvideo
 * - Signed URLs   : https://docs.bunny.net/docs/stream-signed-urls
 * - Upload direct : https://docs.bunny.net/reference/video_createvideo
 */

// ─── Configuration ───────────────────────────────────────────────────────────

function getConfig() {
  return {
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID || "",
    apiKey: process.env.BUNNY_STREAM_API_KEY || "",
    /** Hostname CDN de votre Pull Zone, ex : vz-xxxxxxxx.b-cdn.net */
    cdnHostname: process.env.BUNNY_STREAM_CDN_HOSTNAME || "",
    /**
     * Clé d'authentification des tokens signés.
     * À récupérer dans le dashboard Bunny :
     * Video Library → Security → Token Authentication Key
     */
    tokenKey: process.env.BUNNY_STREAM_TOKEN_AUTHENTICATION_KEY || "",
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BunnySignedUrlOptions {
  /** UUID de la vidéo chez Bunny (videoId) */
  videoId: string;
  /** Durée de validité en secondes (défaut : 7 200 = 2 h) */
  expiresInSeconds?: number;
  /** Restreindre à une adresse IP spécifique (optionnel, recommandé) */
  userIp?: string;
}

export interface BunnyUploadSession {
  /** videoId Bunny à stocker en base de données */
  videoId: string;
  /** URL d'upload TUS à fournir au navigateur */
  uploadUrl: string;
}

// ─── URL de lecture signée ────────────────────────────────────────────────────

/**
 * Génère une URL HLS signée valable `expiresInSeconds` secondes.
 *
 * Format du token HMAC-SHA256 (algo officiel Bunny) :
 *   token = HMAC-SHA256( tokenKey, cdnHostname + videoId + expires + userIp? )
 *   (encodé en base64url sans padding)
 *
 * URL finale :
 *   https://{cdnHostname}/{videoId}/playlist.m3u8?token={token}&expires={ts}
 */
export function buildBunnySignedUrl(options: BunnySignedUrlOptions): string {
  const { videoId, expiresInSeconds = 7200, userIp = "" } = options;
  const config = getConfig();

  if (!config.cdnHostname) {
    // En mode développement sans variables configurées, on retourne une URL locale fictive
    return `https://bunny-cdn-example.b-cdn.net/${videoId}/playlist.m3u8`;
  }

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Chaîne de hachage selon la spec Bunny Stream Signed URLs
  const hashContent = config.tokenKey + config.cdnHostname + "/" + videoId + expires + userIp;

  const token = createHmac("sha256", config.tokenKey)
    .update(hashContent)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const params = new URLSearchParams({ token, expires: String(expires) });
  if (userIp) params.set("ip", userIp);

  return `https://${config.cdnHostname}/${videoId}/playlist.m3u8?${params.toString()}`;
}

/**
 * Retourne une URL de miniature (thumbnail) Bunny Stream.
 * Utile pour les balises <meta og:image> et les aperçus catalogue.
 */
export function buildBunnyThumbnailUrl(videoId: string, timestamp = 0): string {
  const { cdnHostname } = getConfig();
  if (!cdnHostname) return "";
  return `https://${cdnHostname}/${videoId}/thumbnail.jpg?time=${timestamp}`;
}

// ─── Création d'une vidéo (métadonnées) ──────────────────────────────────────

/**
 * Crée une entrée vidéo dans la bibliothèque Bunny.
 * Retourne le videoId Bunny à stocker dans `media.videoStreamId`.
 */
export async function createBunnyVideo(title: string): Promise<string> {
  const { libraryId, apiKey } = getConfig();

  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bunny createVideo error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // L'API retourne { guid: "xxxxxxxx-xxxx-..." }
  return data.guid as string;
}

// ─── URL d'upload direct TUS ──────────────────────────────────────────────────

/**
 * Crée une session d'upload TUS Bunny Stream.
 *
 * Flux recommandé pour le back-office :
 *  1. Appeler cette fonction côté serveur pour obtenir `uploadUrl` et `videoId`.
 *  2. Stocker `videoId` dans `media.videoStreamId`.
 *  3. Envoyer `uploadUrl` au client (admin) pour un upload TUS direct depuis le navigateur.
 *
 * Bibliothèque client recommandée : `tus-js-client`
 */
export async function createBunnyUploadSession(
  title: string,
  fileSizeBytes: number
): Promise<BunnyUploadSession> {
  const { libraryId, apiKey } = getConfig();

  // Étape 1 : créer la vidéo pour obtenir un videoId
  const videoId = await createBunnyVideo(title);

  // Étape 2 : générer l'URL d'upload TUS signée
  const expiry = Math.floor(Date.now() / 1000) + 3600; // valide 1 heure

  // Signature de l'upload : HMAC-SHA256(apiKey + libraryId + videoId + expiry)
  const signature = createHmac("sha256", apiKey)
    .update(libraryId + videoId + expiry)
    .digest("hex");

  const uploadUrl = `https://video.bunnycdn.com/tusupload`;

  return {
    videoId,
    uploadUrl,
    // Les headers TUS sont à transmettre au client
    // Voir: https://docs.bunny.net/reference/video_createvideo (section TUS)
    // Headers requis côté client:
    //   Tus-Resumable: 1.0.0
    //   Upload-Length: <fileSizeBytes>
    //   Content-Type: application/offset+octet-stream
    //   AuthorizationSignature: <signature>
    //   AuthorizationExpire: <expiry>
    //   VideoId: <videoId>
    //   LibraryId: <libraryId>
    // Le client doit les inclure dans toutes les requêtes TUS
  } as BunnyUploadSession & {
    signature: string;
    expiry: number;
    libraryId: string;
  };
}

// ─── Suppression d'une vidéo ──────────────────────────────────────────────────

/**
 * Supprime une vidéo de la bibliothèque Bunny.
 * À appeler depuis `/api/admin/medias` lors de la suppression d'un média.
 */
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const { libraryId, apiKey } = getConfig();
  await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
}

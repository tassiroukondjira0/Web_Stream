import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

/**
 * Clé de signature des sessions.
 *
 * ⚠️ NEXTAUTH_SECRET doit être défini en production. Aucun secret codé en dur
 * n'est fourni comme repli : une valeur publique permettrait à quiconque de
 * forger une session administrateur.
 *
 * Le contrôle n'est PAS fait à l'import : Next.js évalue les modules de route
 * handlers pendant « Collecting page data » au build, ce qui ferait échouer la
 * compilation. On échoue donc à l'appel, quand la clé est réellement nécessaire.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET est requis. Générer une valeur forte : openssl rand -base64 32"
    );
  }

  return new TextEncoder().encode(secret);
}

export const COOKIE_NAME = "stream_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN";
}

// 1. Hachage des mots de passe
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 2. Gestion des Jetons JWT
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// 3. Récupération de la session courante depuis les cookies Next.js
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

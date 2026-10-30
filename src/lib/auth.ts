import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

/**
 * Durée de vie d'une session connectée : 1 semaine.
 * L'utilisateur reste authentifié sans ressaisir ses identifiants pendant
 * toute cette période (le jeton JWT et le cookie expirent simultanément).
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Options de cookie de session, partagées par la connexion et l'inscription. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

/**
 * Accès total au catalogue : l'ADMIN et le SUPER_ADMIN n'ont pas besoin du pass Premium.
 * SUBSCRIBER = abonné payant, ADMIN/SUPER_ADMIN = accès implicite à tout.
 */
export function hasPremiumAccess(role: SessionUser["role"]): boolean {
  return role === "SUBSCRIBER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Accès à l'interface d'administration (lecture + actions courantes). */
export function hasAdminAccess(role: SessionUser["role"]): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Accès super-admin : gestion des rôles, imports, suppression d'admins. */
export function hasSuperAdminAccess(role: SessionUser["role"]): boolean {
  return role === "SUPER_ADMIN";
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
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
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
export async function getCurrentUser(token?: string): Promise<SessionUser | null> {
  let resolvedToken = token;
  if (!resolvedToken) {
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch {
      return null;
    }
    resolvedToken = cookieStore.get(COOKIE_NAME)?.value;
  }
  if (!resolvedToken) return null;
  const claims = await verifySessionToken(resolvedToken);
  if (!claims || process.env.DATABASE_READY !== "true") return null;

  const current = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, email: true, name: true, role: true },
  }).catch(() => null);
  if (!current) return null;
  return {
    id: current.id,
    email: current.email,
    name: current.name || "Utilisateur",
    role: current.role,
  };
}

export async function getCurrentUserFromRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  return getCurrentUser(bearer);
}

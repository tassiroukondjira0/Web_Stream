import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";
import PremiumClient from "./premium-client";

export const metadata: Metadata = {
  title: "Abonnement Premium — Accès Intégral & Haute Définition",
  description:
    "Débloquez tout le catalogue en 4K Ultra HD sans publicité, et soutenez directement la création indépendante.",
};

/** Page dépendant de la session : rendu à la requête (rôle Premium). */
export const instant = false;

export default async function PremiumPage() {
  await connection();

  const user = await getCurrentUser();
  const isPremium = user ? hasPremiumAccess(user.role) : false;

  return (
    <PremiumClient
      user={user ? { name: user.name, email: user.email, role: user.role } : null}
      isPremium={isPremium}
    />
  );
}

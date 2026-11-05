import { prisma } from "@/lib/prisma";

/**
 * Nettoie les codes de vérification et de réinitialisation expirés de la base de données.
 * Appelé automatiquement avant chaque opération d'authentification pour éviter
 * l'accumulation de codes sensibles dans la base.
 */
export async function cleanupExpiredCodes() {
  const now = new Date();

  // Nettoie les codes de vérification email expirés
  await prisma.user.updateMany({
    where: {
      verificationCodeExpiry: {
        lt: now,
      },
      verificationCode: {
        not: null,
      },
    },
    data: {
      verificationCode: null,
      verificationCodeExpiry: null,
    },
  });

  // Nettoie les codes de réinitialisation de mot de passe expirés
  await prisma.user.updateMany({
    where: {
      resetCodeExpiry: {
        lt: now,
      },
      resetCode: {
        not: null,
      },
    },
    data: {
      resetCode: null,
      resetCodeExpiry: null,
    },
  });
}

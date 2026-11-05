import emailjs from '@emailjs/nodejs';

/**
 * Envoie un code de vérification par email à l'utilisateur.
 * Le template OTP (template_hb75ugt) attend les variables :
 *   - passcode : le code à 6 chiffres
 *   - time : la durée d'expiration en minutes
 *   - toEmail : l'email du destinataire (via template)
 */
export async function sendVerificationEmail(to: string, code: string) {
  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID || '',
    process.env.EMAILJS_TEMPLATE_ID || '',
    {
      toEmail: to,
      passcode: code,
      time: '10',
    },
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
      privateKey: process.env.EMAILJS_SECRET_KEY || '',
    }
  );
}

/**
 * Envoie un code de réinitialisation de mot de passe par email.
 */
export async function sendPasswordResetEmail(to: string, code: string) {
  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID || '',
    process.env.EMAILJS_TEMPLATE_ID || '',
    {
      toEmail: to,
      passcode: code,
      time: '10',
    },
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
      privateKey: process.env.EMAILJS_SECRET_KEY || '',
    }
  );
}

/**
 * Génère un code aléatoire à 6 chiffres.
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

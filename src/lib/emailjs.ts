import emailjs from '@emailjs/nodejs';

/**
 * Vérifie que les variables d'environnement EmailJS sont configurées.
 * Retourne un message d'erreur si une variable manquante est détectée.
 */
export function checkEmailJSConfig(): string | null {
  const required = [
    { key: 'EMAILJS_SERVICE_ID', label: 'Service ID' },
    { key: 'EMAILJS_TEMPLATE_ID', label: 'Template ID' },
    { key: 'EMAILJS_PUBLIC_KEY', label: 'Public Key' },
    { key: 'EMAILJS_SECRET_KEY', label: 'Secret Key' },
  ];

  for (const { key, label } of required) {
    if (!process.env[key]) {
      return `Variable d'environnement ${key} (${label}) non configurée. Configurez EmailJS dans votre fichier .env.local.`;
    }
  }
  return null;
}

/**
 * Envoie un code de vérification par email à l'utilisateur.
 * Le template OTP attend les variables :
 *   - passcode : le code à 6 chiffres
 *   - time : la durée d'expiration en minutes
 *   - email : l'email du destinataire (via template)
 */
export async function sendVerificationEmail(to: string, code: string) {
  // Vérifier la configuration
  const configError = checkEmailJSConfig();
  if (configError) {
    console.error('[EmailJS Configuration Error]', configError);
    throw new Error(`Email non configuré : ${configError}`);
  }

  console.log('[EmailJS] Envoi du code de vérification à', to, 'avec le code', code);
  console.log('[EmailJS] Service ID:', process.env.EMAILJS_SERVICE_ID);
  console.log('[EmailJS] Template ID:', process.env.EMAILJS_TEMPLATE_ID);

  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ID!,
      {
        email: to,
        passcode: code,
        time: '10',
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY!,
        privateKey: process.env.EMAILJS_SECRET_KEY!,
      }
    );

    console.log('[EmailJS] Email envoyé avec succès ! Response:', response);
    return response;
  } catch (error: unknown) {
    console.error('[EmailJS] Erreur lors de l\'envoi de l\'email:', error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[EmailJS] Message d\'erreur:', msg);
    throw error;
  }
}

/**
 * Envoie un code de réinitialisation de mot de passe par email.
 */
export async function sendPasswordResetEmail(to: string, code: string) {
  // Vérifier la configuration
  const configError = checkEmailJSConfig();
  if (configError) {
    console.error('[EmailJS Configuration Error]', configError);
    throw new Error(`Email non configuré : ${configError}`);
  }

  console.log('[EmailJS] Envoi du code de réinitialisation à', to, 'avec le code', code);

  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ID!,
      {
        email: to,
        passcode: code,
        time: '10',
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY!,
        privateKey: process.env.EMAILJS_SECRET_KEY!,
      }
    );

    console.log('[EmailJS] Email de réinitialisation envoyé avec succès ! Response:', response);
    return response;
  } catch (error: unknown) {
    console.error('[EmailJS] Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[EmailJS] Message d\'erreur:', msg);
    throw error;
  }
}

/**
 * Génère un code aléatoire à 6 chiffres.
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

import { NextResponse } from "next/server";

const FAQ_KNOWLEDGE = `
CinémaMax - Questions fréquentes:
- Compte: inscription sur /inscription, connexion sur /connexion. Mot de passe minimum 8 caractères.
- Abonnement Premium: 1500 FCFA/mois ou 15000 FCFA/an depuis /premium. Paiement via PayDunya (Wave, Orange Money, carte bancaire).
- Lecture: reprise automatique de la lecture sauvegardée. Certains contenus nécessitent un abonnement Premium.
- Favoris/Souhaits: accessibles depuis Mon Compte.
- Mots de passe: peut être changé depuis Mon Compte > Changer mon mot de passe.
- Support: support@cinemax.local
`;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ reply: "Posez votre question, je vous réponds." });
    }

    // Réponse basée sur connaissance du site (sans API externe)
    const lower = message.toLowerCase();

    if (lower.includes("compte") || lower.includes("inscri") || lower.includes("connect")) {
      return NextResponse.json({
        reply: "Pour créer un compte : allez sur /inscription. Pour vous connecter : /connexion. Si vous avez oublié votre mot de passe, utilisez le formulaire de contact.",
      });
    }
    if (lower.includes("premium") || lower.includes("abonn") || lower.includes("payer")) {
      return NextResponse.json({
        reply: "L'abonnement Premium coûte 1500 FCFA/mois ou 15000 FCFA/an. Souscrivez depuis /premium. Paiement sécurisé via PayDunya (Wave, Orange Money, carte bancaire).",
      });
    }
    if (lower.includes("mot de passe") || lower.includes("mdp")) {
      return NextResponse.json({
        reply: "Vous pouvez changer votre mot de passe depuis Mon Compte > Changer mon mot de passe. Le mot de passe doit avoir au moins 8 caractères avec différents types de caractères.",
      });
    }
    if (lower.includes("favori") || lower.includes("souhait")) {
      return NextResponse.json({
        reply: "Vos favoris et liste de souhaits sont accessibles depuis votre compte (/mon-compte). Vous pouvez les ajouter/retirer depuis les fiches films/séries.",
      });
    }
    if (lower.includes("lecture") || lower.includes("reprise")) {
      return NextResponse.json({
        reply: "La reprise de lecture est automatique. Votre progression est sauvegardée et vous pouvez reprendre où vous vous êtes arrêté.",
      });
    }
    if (lower.includes("contact") || lower.includes("support")) {
      return NextResponse.json({
        reply: "Vous pouvez nous contacter à support@cinemax.local. Pour les urgences de compte/paiement, indiquez votre adresse e-mail utilisée sur le site.",
      });
    }

    return NextResponse.json({
      reply: "Je peux vous aider sur : compte, inscription/connexion, abonnement Premium, paiement, favoris, reprise de lecture, changement de mot de passe. Reformulez votre question ou contactez support@cinemax.local si nécessaire.",
    });
  } catch (error) {
    console.error("chat error:", error);
    return NextResponse.json({ reply: "Erreur serveur. Réessayez plus tard." }, { status: 500 });
  }
}

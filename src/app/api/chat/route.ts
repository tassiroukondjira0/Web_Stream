import { NextResponse } from "next/server";

const FAQ_KNOWLEDGE = `CinéMax - Plateforme de streaming légal de films, séries et animés.

PAGES : / (accueil), /films, /series, /animes, /nouveautes, /recherche, /mon-compte, /favoris, /souhaits, /premium, /aide, /connexion, /inscription, /mentions-legales, /confidentialite, /conditions, /admin, /admin/notifications

FONCTIONNALITÉS : Catalogue films/séries/animés (TMDB + partenaires). Lecteur multi-sources (Vidzy, uqload, voe, fsvid, netu, luluvido). Reprise automatique (sauvegarde 10s). Favoris et souhaits. Historique. Premium (1500 FCFA/mois ou 15000 FCFA/an). Paiement PayDunya (Wave, Orange Money, CB). Notifications in-app. Recherche et filtres. Partage de liens. Marquage épisodes vus.

COMPTE : Inscription /inscription (email + mdp min 8 car.). Connexion /connexion. Rôles USER/SUBSCRIBER/ADMIN. Changement mdp depuis Mon Compte. Profil : nom, email, pays.

PREMIUM : 1500 FCFA/mois ou 15000 FCFA/an. Souscription /premium. Paiement PayDunya. Accès catalogue complet + exclusifs. Annulation /premium/cancel.

LECTEUR : Vidzy (HD, VF/VOSTFR). Sources partenaires (uqload, voe, fsvid, netu, luluvido). Langue (VF, VOSTFR, VO). Épisode/saison. Reprise auto. Rechargement manuel. Certaines sources nécessitent Premium.

SUPPORT : support@cinemax.local. Page /aide (FAQ + assistant IA).

ADMIN : /admin (gestion médias, import TMDB, sync). /admin/notifications (envoi notifs). Réservé ADMIN.

LÉGAL : /mentions-legales, /confidentialite, /conditions. Données protégées, mdp hachés.`;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ reply: "Posez votre question, je vous réponds." });
    }

    const lower = message.toLowerCase();
    const reply = generateReply(lower);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("chat error:", error);
    return NextResponse.json({ reply: "Erreur serveur. Réessayez plus tard." }, { status: 500 });
  }
}

function generateReply(lower: string): string {
  // Compte & inscription
  if (lower.includes("compte") || lower.includes("profil") || lower.includes("mon compte")) {
    return "Votre compte est accessible depuis /mon-compte. Vous y trouverez vos favoris, votre liste de souhaits, votre historique de visionnage et la possibilité de changer votre mot de passe. Pour créer un compte : /inscription. Pour vous connecter : /connexion.";
  }

  // Inscription
  if (lower.includes("inscri") || lower.includes("créer") || lower.includes("nouveau compte")) {
    return "Pour créer un compte, rendez-vous sur /inscription. Renseignez votre adresse e-mail, un mot de passe d'au moins 8 caractères (avec majuscules, minuscules, chiffres et caractères spéciaux), et votre nom. Votre compte sera créé immédiatement.";
  }

  // Connexion
  if (lower.includes("connect") || lower.includes("login") || lower.includes("connexion")) {
    return "Pour vous connecter, rendez-vous sur /connexion. Entrez votre adresse e-mail et votre mot de passe. Si vous avez oublié votre mot de passe, contactez-nous à support@cinemax.local.";
  }

  // Mot de passe
  if (lower.includes("mot de passe") || lower.includes("mdp") || lower.includes("password")) {
    return "Vous pouvez changer votre mot de passe depuis Mon Compte (/mon-compte) > Changer mon mot de passe. Le mot de passe doit comporter au moins 8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux.";
  }

  // Premium & abonnement
  if (lower.includes("premium") || lower.includes("abonn") || lower.includes("souscri")) {
    return "L'abonnement Premium coûte 1500 FCFA/mois ou 15000 FCFA/an. Il donne accès au catalogue complet et aux contenus exclusifs. Souscrivez depuis /premium. Paiement sécurisé via PayDunya (Wave, Orange Money, carte bancaire).";
  }

  // Paiement
  if (lower.includes("payer") || lower.includes("paiement") || lower.includes("wave") || lower.includes("orange money") || lower.includes("carte")) {
    return "Les paiements sont traités via PayDunya (Wave, Orange Money, carte bancaire internationale). Le paiement est sécurisé et aucun numéro de carte n'est stocké. En cas de problème de paiement, contactez support@cinemax.local avec votre référence de transaction.";
  }

  // Annulation premium
  if (lower.includes("annul") || lower.includes("résil") || lower.includes("cancel")) {
    return "Vous pouvez annuler votre abonnement Premium depuis /premium/cancel. L'annulation prend effet à la fin de la période payée.";
  }

  // Favoris
  if (lower.includes("favori")) {
    return "Vos favoris sont accessibles depuis /favoris ou depuis Mon Compte (/mon-compte). Vous pouvez ajouter ou retirer un titre depuis sa fiche en cliquant sur le bouton favori.";
  }

  // Liste de souhaits
  if (lower.includes("souhait") || lower.includes("wishlist")) {
    return "Votre liste de souhaits est accessible depuis /souhaits ou depuis Mon Compte (/mon-compte). Ajoutez des titres depuis leurs fiches pour les retrouver plus tard.";
  }

  // Lecture & reprise
  if (lower.includes("lecture") || lower.includes("reprise") || lower.includes("reprendre") || lower.includes("continuer")) {
    return "La reprise de lecture est automatique. Votre progression est sauvegardée toutes les 10 secondes. Retrouvez la reprise dans votre espace Mon Compte. Certains contenus nécessitent un abonnement Premium.";
  }

  // Recherche
  if (lower.includes("recherche") || lower.includes("chercher") || lower.includes("trouver")) {
    return "Utilisez la barre de recherche dans la navbar (en haut) ou rendez-vous sur /recherche. Vous pouvez filtrer par genre, année, type de contenu, etc.";
  }

  // Catalogue
  if (lower.includes("catalogue") || lower.includes("film") || lower.includes("série") || lower.includes("anime") || lower.includes("animé")) {
    return "Le catalogue est accessible depuis /films, /series et /animes. Les nouveautés sont sur /nouveautes. Vous y trouverez des films, séries, documentaires et animés en streaming légal. Certains contenus nécessitent un abonnement Premium.";
  }

  // Nouveautés
  if (lower.includes("nouveauté") || lower.includes("nouveau") || lower.includes("sortie") || lower.includes("récent")) {
    return "Les dernières sorties sont disponibles sur /nouveautes. Les nouveautés sont mises à jour régulièrement.";
  }

  // Lecteur vidéo
  if (lower.includes("lecteur") || lower.includes("player") || lower.includes("vidéo") || lower.includes("source") || lower.includes("qualité")) {
    return "Le lecteur vidéo multi-sources propose plusieurs hébergeurs (Vidzy, uqload, voe, etc.). Vous pouvez choisir la langue (VF, VOSTFR, VO), l'épisode et le lecteur depuis les menus déroulants. La reprise de lecture est automatique. En cas de problème, rechargez le lecteur avec le bouton de rechargement.";
  }

  // Langue
  if (lower.includes("langue") || lower.includes("vf") || lower.includes("vostfr") || lower.includes("vo") || lower.includes("sous-titre")) {
    return "Vous pouvez choisir la langue de lecture (VF, VOSTFR, VO) depuis le menu déroulant « Langue » sous le lecteur vidéo. Les langues disponibles dépendent du titre.";
  }

  // Contact & support
  if (lower.includes("contact") || lower.includes("support") || lower.includes("aide") || lower.includes("problème") || lower.includes("bug")) {
    return "Vous pouvez nous contacter à support@cinemax.local. Pour les problèmes de compte ou de paiement, indiquez votre adresse e-mail. La page /aide contient aussi une FAQ complète.";
  }
  // Légal
  if (lower.includes("légal") || lower.includes("mention") || lower.includes("confidentialité") || lower.includes("condition") || lower.includes("rgpd") || lower.includes("données")) {
    return "Les mentions légales sont sur /mentions-legales, la politique de confidentialité sur /confidentialite et les conditions d'utilisation sur /conditions. Vos données personnelles sont protégées et vos mots de passe sont hachés.";
  }

  // Historique
  if (lower.includes("historique") || lower.includes("vu") || lower.includes("regardé")) {
    return "Votre historique de visionnage est accessible depuis Mon Compte (/mon-compte). Votre progression de lecture est sauvegardée automatiquement.";
  }

  // Notifications
  if (lower.includes("notification") || lower.includes("cloche") || lower.includes("alerte")) {
    return "Les notifications in-app sont accessibles via la cloche dans la barre de navigation. Vous recevez des alertes pour les nouveautés et les annonces importantes.";
  }

  // Partage
  if (lower.includes("partage") || lower.includes("share") || lower.includes("lien")) {
    return "Vous pouvez partager un titre via le bouton de partage sur sa fiche. Le lien partagé redirige vers la page du titre.";
  }

  // Admin
  if (lower.includes("admin") || lower.includes("dashboard") || lower.includes("gestion") || lower.includes("modération")) {
    return "Le dashboard admin (/admin) est réservé aux comptes administrateurs. Il permet de gérer les médias, importer depuis TMDB, synchroniser les catalogues partenaires et envoyer des notifications.";
  }

  // Filtrage & recherche avancée
  if (lower.includes("filtre") || lower.includes("tri") || lower.includes("genre") || lower.includes("année")) {
    return "Utilisez les filtres avancés sur les pages Films, Séries et Animés pour filtrer par genre, année, type d'accès (gratuit/premium), etc. La recherche est aussi disponible via la barre de recherche.";
  }

  // Mobile / app
  if (lower.includes("mobile") || lower.includes("application") || lower.includes("app") || lower.includes("téléphone")) {
    return "CinéMax est une application web responsive, accessible depuis tout navigateur sur mobile, tablette et ordinateur. Aucune application native n'est nécessaire.";
  }

  // Qualité vidéo
  if (lower.includes("qualité") || lower.includes("hd") || lower.includes("4k") || lower.includes("résolution") || lower.includes("buffering") || lower.includes("lag")) {
    return "Les vidéos sont disponibles en haute définition. En cas de buffering ou de lag, vérifiez votre connexion internet. Vous pouvez recharger le lecteur avec le bouton de rechargement.";
  }

  // Salutations
  if (lower.includes("bonjour") || lower.includes("salut") || lower.includes("hello") || lower.includes("hi") || lower.includes("bonsoir")) {
    return "Bonjour ! Je suis l'assistant IA de CinéMax. Comment puis-je vous aider ? Vous pouvez me poser des questions sur le compte, l'abonnement Premium, la lecture, les favoris, la recherche, etc.";
  }

  if (lower.includes("merci") || lower.includes("thanks")) {
    return "De rien ! N'hésitez pas si vous avez d'autres questions. Pour une assistance personnalisée, contactez support@cinemax.local.";
  }

  // Réponse par défaut
  return "Je peux vous aider sur de nombreux sujets : compte et inscription, connexion, abonnement Premium, paiement, favoris et liste de souhaits, reprise de lecture, recherche et navigation, catalogue (films, séries, animés), notifications, partage, historique, changement de mot de passe, questions légales, et plus encore. Reformulez votre question ou contactez support@cinemax.local si nécessaire.";
}
import { NextResponse } from "next/server";

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
    return "📋 Votre espace personnel\n\nVotre compte est accessible depuis la page **Mon Compte** (/mon-compte). Vous y trouverez :\n\n• **Mes favoris** — les titres que vous avez marqués comme favoris\n• **Ma liste de souhaits** — les titres que vous comptez regarder plus tard\n• **Mon historique** — votre progression de lecture sauvegardée automatiquement\n• **Changer mon mot de passe** — mettez à jour vos identifiants en toute sécurité\n• **Mes informations** — nom, e-mail, pays\n\n🔗 Accès rapide : /favoris, /souhaits, /mon-compte\n\nPour créer un compte : /inscription\nPour vous connecter : /connexion";
  }

  // Inscription
  if (lower.includes("inscri") || lower.includes("créer") || lower.includes("nouveau compte")) {
    return "📝 Créer un compte CinéMax\n\nRendez-vous sur la page **Inscription** (/inscription) et suivez ces étapes :\n\n1. Renseignez votre **adresse e-mail** valide\n2. Choisissez un **mot de passe** robuste (au moins 8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux)\n3. Entrez votre **nom** ou pseudo\n4. Validez le formulaire\n\n✅ Votre compte est créé immédiatement — pas de vérification e-mail requise.\n\nUne fois inscrit, vous pouvez :\n• Ajouter des favoris et des souhaits\n• Suivre votre historique de lecture\n• Souscrire à l'offre Premium pour un accès complet\n\n🔗 Page d'inscription : /inscription";
  }

  // Connexion
  if (lower.includes("connect") || lower.includes("login") || lower.includes("connexion")) {
    return "🔑 Se connecter à CinéMax\n\nRendez-vous sur la page **Connexion** (/connexion) :\n\n1. Entrez votre **adresse e-mail** utilisée lors de l'inscription\n2. Saisissez votre **mot de passe**\n3. Cliquez sur « Se connecter »\n\nVous serez redirigé vers votre espace personnel.\n\n⚠️ **Mot de passe oublié ?**\nLa réinitialisation automatique n'est pas encore disponible. Contactez-nous à **support@cinemax.local** en indiquant votre adresse e-mail, et nous vous aiderons à récupérer l'accès à votre compte.\n\n🔗 Page de connexion : /connexion";
  }

  // Mot de passe
  if (lower.includes("mot de passe") || lower.includes("mdp") || lower.includes("password")) {
    return "🔒 Gestion du mot de passe\n\n**Changer votre mot de passe :**\n1. Connectez-vous à votre compte\n2. Allez sur **Mon Compte** (/mon-compte)\n3. Cliquez sur « Changer mon mot de passe »\n4. Entrez votre mot de passe actuel puis le nouveau\n\n**Exigences du mot de passe :**\n• Minimum 8 caractères\n• Au moins une majuscule\n• Au moins une minuscule\n• Au moins un chiffre\n• Au moins un caractère spécial (!@#$%&*…)\n\n⚠️ **Mot de passe oublié ?**\nContactez-nous à **support@cinemax.local** — notre équipe vous aidera à récupérer l'accès à votre compte.";
  }

  // Premium & abonnement
  if (lower.includes("premium") || lower.includes("abonn") || lower.includes("souscri")) {
    return "⭐ L'abonnement Premium CinéMax\n\n**Tarifs :**\n• 📅 **Mensuel** : 1 500 FCFA / mois\n• 📆 **Annuel** : 15 000 FCFA / an (économisez 2 mois !)\n\n**Avantages Premium :**\n• 🎬 Accès au **catalogue complet** — films, séries et animés\n• 🔥 Contenus **exclusifs** réservés aux abonnés\n• 🚫 Suppression des restrictions des films gratuits\n• 🎨 Expérience sans interruption\n\n**Comment souscrire :**\n1. Rendez-vous sur la page **Premium** (/premium)\n2. Choisissez votre formule (mensuelle ou annuelle)\n3. Payez via **PayDunya** (Wave, Orange Money, carte bancaire)\n4. Votre accès est activé immédiatement\n\n**Annuler votre abonnement :**\nVous pouvez annuler à tout moment depuis /premium/cancel. L'annulation prend effet à la fin de la période déjà payée.\n\n🔗 Page Premium : /premium";
  }

  // Paiement
  if (lower.includes("payer") || lower.includes("paiement") || lower.includes("wave") || lower.includes("orange money") || lower.includes("carte")) {
    return "💳 Paiement sécurisé CinéMax\n\n**Moyens de paiement acceptés :**\n• 📱 **Wave** — paiement mobile rapide\n• 📲 **Orange Money** — transfert mobile sécurisé\n• 💳 **Carte bancaire** — Visa, Mastercard internationale\n\n**Sécurité :**\n• Les paiements sont traités par **PayDunya**, un processeur de paiement certifié\n• Aucun numéro de carte bancaire n'est stocké sur nos serveurs\n• Toutes les transactions sont chiffrées en HTTPS\n\n**En cas de problème de paiement :**\n1. Vérifiez que votre solde est suffisant (Wave/Orange Money)\n2. Confirmez que votre carte est activée pour les paiements en ligne\n3. Contactez-nous à **support@cinemax.local** en indiquant :\n   - Votre adresse e-mail de compte\n   - La référence de transaction\n   - Le montant et la date du paiement\n\nNotre équipe traitera votre demande sous 24h.";
  }

  // Annulation premium
  if (lower.includes("annul") || lower.includes("résil") || lower.includes("cancel")) {
    return "🚫 Annuler votre abonnement Premium\n\n**Procédure d'annulation :**\n1. Connectez-vous à votre compte\n2. Rendez-vous sur /premium/cancel\n3. Confirmez l'annulation\n\n**Important :**\n• ✅ L'annulation prend effet à la **fin de la période déjà payée**\n• ✅ Vous conservez vos avantages Premium jusqu'à la fin de la période\n• ✅ Aucun frais supplémentaire n'est appliqué\n• ✅ Votre compte reste actif en mode gratuit après expiration\n\n💡 Vous pouvez ressouscrire à tout moment depuis /premium.\n\nBesoin d'aide ? Contactez-nous à **support@cinemax.local**.";
  }

  // Favoris
  if (lower.includes("favori")) {
    return "❤️ Vos favoris CinéMax\n\n**Accéder à vos favoris :**\n• Page dédiée : /favoris\n• Depuis Mon Compte (/mon-compte) > section « Mes favoris »\n\n**Comment ajouter un favori :**\n1. Ouvrez la fiche d'un film, série ou animé\n2. Cliquez sur le bouton **cœur** (❤️) en haut de la fiche\n3. Le titre est ajouté instantanément à votre liste\n\n**Retirer un favori :**\n• Cliquez à nouveau sur le cœur ou retirez-le depuis votre liste de favoris\n\n💡 Vos favoris sont synchronisés — accédez-y depuis n'importe quel appareil connecté à votre compte.";
  }

  // Liste de souhaits
  if (lower.includes("souhait") || lower.includes("wishlist")) {
    return "📋 Votre liste de souhaits\n\n**Accéder à votre liste :**\n• Page dédiée : /souhaits\n• Depuis Mon Compte (/mon-compte) > section « Ma liste de souhaits »\n\n**Comment l'utiliser :**\n1. Ouvrez la fiche d'un titre qui vous intéresse\n2. Cliquez sur le bouton **liste de souhaits** pour l'ajouter\n3. Retrouvez tous vos titres sauvegardés dans votre liste\n\n💡 Utilisez cette liste pour planifier vos prochaines séances de visionnage. Vous pouvez déplacer des titres entre vos favoris et votre liste de souhaits.";
  }

  // Lecture & reprise
  if (lower.includes("lecture") || lower.includes("reprise") || lower.includes("reprendre") || lower.includes("continuer")) {
    return "▶️ Reprise de lecture automatique\n\n**Comment ça fonctionne :**\n• Votre progression est sauvegardée **toutes les 10 secondes** automatiquement\n• Quand vous revenez sur un titre en cours, la lecture reprend là où vous vous êtes arrêté\n• La reprise fonctionne pour les films ET les séries (par épisode)\n\n**Où retrouver vos reprises :**\n• Page **Mon Compte** (/mon-compte) — section « En cours de lecture »\n• L'historique affiche vos derniers titres regardés avec la progression\n\n⚠️ **Note :** Certains contenus Premium peuvent nécessiter un abonnement actif pour reprendre la lecture.\n\n💡 Si la reprise ne fonctionne pas, essayez de recharger la page ou de vérifier votre connexion internet.";
  }

  // Recherche
  if (lower.includes("recherche") || lower.includes("chercher") || lower.includes("trouver")) {
    return "🔍 Rechercher sur CinéMax\n\n**Barre de recherche (navbar) :**\n• Utilisez la barre de recherche en haut de chaque page\n• Tapez le titre d'un film, série ou animé\n• Les résultats apparaissent en temps réel\n\n**Page de recherche avancée :**\n• Rendez-vous sur /recherche pour une recherche complète\n• Filtrez par **genre**, **année**, **type de contenu** (film, série, animé)\n• Triez par popularité ou date d'ajout\n\n**Filtres par genre (page d'accueil) :**\n• Sur la page d'accueil, utilisez les **boutons de genre** (Action, Romance, Animation, Horreur, etc.) pour filtrer directement le catalogue\n\n💡 Astuce : utilisez des mots-clés précis pour affiner vos résultats (ex: « avatar 2025 » au lieu de « avatar »).";
  }

  // Catalogue
  if (lower.includes("catalogue") || lower.includes("film") || lower.includes("série") || lower.includes("anime") || lower.includes("animé")) {
    return "🎬 Le catalogue CinéMax\n\n**Nos sections :**\n• 🎥 **Films** (/films) — longs métrages, courts métrages\n• 📺 **Séries** (/series) — séries TV, documentaires\n• 🎌 **Animés** (/animes) — mangas, animés japonais\n• 🔥 **Nouveautés** (/nouveautes) — derniers ajouts au catalogue\n\n**Sources du catalogue :**\n• **TMDB** — base de données de métadonnées\n• **Partenaires** — catalogues externes synchronisés\n• **French-Manga** — source spécialisée animés\n\n**Filtrer le catalogue :**\n• Sur la page d'accueil : boutons de genre (Action, Romance, Animation…)\n• Sur les pages Films/Séries/Animés : filtres avancés (genre, année, langue, thème)\n\n⚠️ Certains contenus nécessitent un **abonnement Premium** pour être visionnés.\n\n💡 Le catalogue est mis à jour régulièrement avec de nouveaux titres.";
  }

  // Nouveautés
  if (lower.includes("nouveauté") || lower.includes("nouveau") || lower.includes("sortie") || lower.includes("récent")) {
    return "🆕 Les dernières nouveautés\n\n**Page Nouveautés :** /nouveautes\n\nCette page regroupe les **derniers titres ajoutés** au catalogue, triés du plus récent au plus ancien. Vous y trouverez :\n\n• 🎬 Les derniers films ajoutés\n• 📺 Les nouvelles séries et épisodes\n• 🎌 Les derniers animés et mangas\n\n**Comment rester informé :**\n• Consultez régulièrement /nouveautes\n• Activez les **notifications** via la cloche dans la barre de navigation\n• Inscrivez-vous à notre **newsletter** (bannière en bas de la page d'accueil)\n\n💡 Les nouveautés sont ajoutées quotidiennement grâce à la synchronisation automatique avec nos partenaires.";
  }

  // Lecteur vidéo
  if (lower.includes("lecteur") || lower.includes("player") || lower.includes("vidéo") || lower.includes("source") || lower.includes("qualité")) {
    return "📺 Le lecteur vidéo CinéMax\n\n**Sources disponibles :**\n• **Vidzy** — lecteur principal (HD, VF/VOSTFR)\n• **uqload** — source alternative\n• **voe** — version originale sous-titrée\n• **fsvid** — source partenaire\n• **netu** — source alternative\n• **luluvido** — source de repli\n\n**Options du lecteur :**\n• 🌐 **Langue** — choisissez VF, VOSTFR ou VO\n• 📋 **Épisode/Saison** — pour les séries, sélectionnez l'épisode\n• 🔄 **Rechargement** — si le lecteur ne charge pas, cliquez sur le bouton de rechargement\n• ▶️ **Reprise automatique** — la lecture reprend là où vous vous êtes arrêté\n\n**En cas de problème :**\n1. Essayez une autre source via le menu déroulant\n2. Rechargez le lecteur avec le bouton 🔄\n3. Vérifiez votre connexion internet\n4. Si le problème persiste, contactez **support@cinemax.local**\n\n⚠️ Certaines sources nécessitent un **abonnement Premium**.";
  }

  // Langue
  if (lower.includes("langue") || lower.includes("vf") || lower.includes("vostfr") || lower.includes("vo") || lower.includes("sous-titre")) {
    return "🌐 Langues disponibles\n\n**Options de langue :**\n• **VF** — Version Française (doublage complet)\n• **VOSTFR** — Version Originale Sous-Titrée Français\n• **VO** — Version Originale (sans sous-titres)\n\n**Comment changer de langue :**\n1. Ouvrez la page du film, série ou animé\n2. Sous le lecteur vidéo, trouvez le menu déroulant **« Langue »**\n3. Sélectionnez la langue souhaitée\n4. La page se rechargera avec la nouvelle langue\n\n⚠️ Les langues disponibles **varient selon le titre** et la source.\n\n💡 Si aucune langue ne vous convient, essayez une autre source via le menu « Lecteur ».";
  }

  // Contact & support
  if (lower.includes("contact") || lower.includes("support") || lower.includes("aide") || lower.includes("problème") || lower.includes("bug")) {
    return "📞 Nous contacter\n\n**Plusieurs façons de nous joindre :**\n\n📧 **E-mail général :**\n• contact@cinemax.local — questions générales, suggestions\n\n🛠️ **Support technique :**\n• support@cinemax.local — problèmes de compte, paiement, lecture\n\n📝 **Page Contact :**\n• /contact — formulaire de contact avec sélection du sujet\n\n❓ **FAQ & Assistant IA :**\n• /aide — questions fréquentes et assistant IA interactif\n\n**Horaires de réponse :**\n• Lundi — Vendredi : 9h — 18h (GMT)\n• Week-ends et jours fériés : réponse sous 48h\n\n💡 Pour une réponse rapide, indiquez toujours votre **adresse e-mail de compte** dans votre message.";
  }

  // Légal
  if (lower.includes("légal") || lower.includes("mention") || lower.includes("confidentialité") || lower.includes("condition") || lower.includes("rgpd") || lower.includes("données")) {
    return "⚖️ Informations légales\n\n**Nos pages légales :**\n\n📄 **Mentions légales** (/mentions-legales)\n• Identité de l'éditeur, hébergeur, directeur de la publication\n\n🔒 **Politique de confidentialité** (/confidentialite)\n• Comment vos données sont collectées, utilisées et protégées\n• Vos droits (accès, modification, suppression)\n• Durée de conservation des données\n\n📜 **Conditions d'utilisation** (/conditions)\n• Règles d'utilisation de la plateforme\n• Droits et obligations des utilisateurs\n• Politique de remboursement\n\n**Protection de vos données :**\n• ✅ Mots de passe **hachés** et sécurisés\n• ✅ Échanges **chiffrés en HTTPS**\n• ✅ Aucune donnée bancaire stockée sur nos serveurs\n• ✅ Droit à la suppression de votre compte et de vos données\n\nPour toute question légale, contactez-nous à **contact@cinemax.local**.";
  }

  // Historique
  if (lower.includes("historique") || lower.includes("vu") || lower.includes("regardé")) {
    return "📜 Votre historique de visionnage\n\n**Accéder à votre historique :**\n• Page **Mon Compte** (/mon-compte)\n• Section « Historique de visionnage »\n\n**Ce que vous y trouverez :**\n• 🎬 Les titres que vous avez regardés récemment\n• 📊 Votre **progression de lecture** pour chaque titre\n• ⏱️ Le temps de visionnage par titre\n• ▶️ Les boutons de **reprise** pour continuer là où vous vous êtes arrêté\n\n**Sauvegarde automatique :**\n• Votre progression est sauvegardée **toutes les 10 secondes**\n• L'historique est synchronisé entre vos appareils\n\n💡 L'historique vous aide à retrouver rapidement vos derniers visionnages et à reprendre la lecture sans effort.";
  }

  // Notifications
  if (lower.includes("notification") || lower.includes("cloche") || lower.includes("alerte")) {
    return "🔔 Notifications CinéMax\n\n**Accéder à vos notifications :**\n• Cliquez sur l'icône **cloche** 🔔 dans la barre de navigation en haut de la page\n\n**Types de notifications :**\n• 🆕 **Nouveautés** — nouveaux titres ajoutés au catalogue\n• 📢 **Annonces** — informations importantes sur la plateforme\n• ⭐ **Recommandations** — suggestions basées sur vos favoris\n\n**Gestion des notifications :**\n• Les notifications sont accessibles depuis votre compte\n• Vous pouvez les marquer comme lues\n• Les notifications importantes restent visibles jusqu'à lecture\n\n💡 Restez informé des dernières mises à jour en consultant régulièrement vos notifications.";
  }

  // Partage
  if (lower.includes("partage") || lower.includes("share") || lower.includes("lien")) {
    return "🔗 Partager un titre\n\n**Comment partager :**\n1. Ouvrez la fiche du film, série ou animé que vous souhaitez partager\n2. Cliquez sur le bouton **Partager** (icône de partage) sur la fiche\n3. Copiez le lien ou partagez-le directement sur vos réseaux sociaux\n\n**Ce que reçoit le destinataire :**\n• Un lien direct vers la page du titre sur CinéMax\n• Le destinataire peut découvrir le titre et l'ajouter à sa liste de souhaits\n\n💡 Le partage est un excellent moyen de recommander vos titres préférés à vos amis !";
  }

  // Admin
  if (lower.includes("admin") || lower.includes("dashboard") || lower.includes("gestion") || lower.includes("modération")) {
    return "🛡️ Espace administrateur\n\n**Accès :** /admin (réservé aux comptes ADMIN et SUPER_ADMIN)\n\n**Fonctionnalités du dashboard :**\n\n📊 **Gestion des médias :**\n• Importer des titres depuis TMDB\n• Synchroniser les catalogues partenaires\n• Publier ou dépublier des titres\n• Gérer les doublons\n\n📢 **Notifications :**\n• Envoyer des notifications aux utilisateurs (/admin/notifications)\n• Gérer les annonces de la plateforme\n\n👥 **Utilisateurs :**\n• Voir la liste des utilisateurs inscrits\n• Gérer les rôles (USER, SUBSCRIBER, ADMIN)\n\n📈 **Statistiques :**\n• Nombre d'utilisateurs, de titres, de synchronisations\n• Suivi de l'activité de la plateforme\n\n⚠️ L'accès est strictement réservé aux administrateurs autorisés.";
  }

  // Filtrage & recherche avancée
  if (lower.includes("filtre") || lower.includes("tri") || lower.includes("genre") || lower.includes("année")) {
    return "🎛️ Filtres et recherche avancée\n\n**Sur la page d'accueil :**\n• Utilisez les **boutons de genre** sous le titre « Que voulez-vous regarder ? »\n• Genres disponibles : Tous, Action, Romance, Animation, Horreur, Fantastique, Comédie, Drame, Thriller, Sci-Fi, Documentaire, Aventure\n• Le filtrage s'applique immédiatement aux sections Films, Séries et Animes\n\n**Sur les pages Films, Séries et Animés :**\n• Filtres avancés : genre, année, langue, thème, plateforme\n• Tri par popularité ou date d'ajout\n• Pagination pour parcourir tout le catalogue\n\n**Recherche globale :**\n• Barre de recherche dans la navbar (en haut de chaque page)\n• Page dédiée : /recherche\n\n💡 Combinez les filtres pour affiner vos résultats (ex : genre + année + langue).";
  }

  // Mobile / app
  if (lower.includes("mobile") || lower.includes("application") || lower.includes("app") || lower.includes("téléphone")) {
    return "📱 CinéMax sur mobile\n\n**CinéMax est une application web responsive :**\n• ✅ Accessible depuis **tout navigateur** (Chrome, Safari, Firefox…)\n• ✅ Optimisé pour **mobile, tablette et ordinateur**\n• ✅ Aucune application native à installer\n\n**Fonctionnalités sur mobile :**\n• 🎬 Navigation complète du catalogue\n• ▶️ Lecture vidéo avec lecteur intégré\n• ❤️ Gestion des favoris et souhaits\n• 🔍 Recherche et filtres\n• 👤 Compte et historique\n\n**Conseils pour une meilleure expérience :**\n• Utilisez une connexion internet stable (4G/Wi-Fi)\n• Activez le mode paysage pour une meilleure lecture\n• Ajoutez CinéMax à votre écran d'accueil pour un accès rapide\n\n💡 L'expérience est identique sur tous les appareils — vos données sont synchronisées.";
  }

  // Qualité vidéo & problèmes techniques
  if (lower.includes("qualité") || lower.includes("hd") || lower.includes("4k") || lower.includes("résolution") || lower.includes("buffering") || lower.includes("lag")) {
    return "🎥 Qualité vidéo et dépannage\n\n**Qualités disponibles :**\n• Les vidéos sont diffusées en **haute définition (HD)**\n• La qualité exacte dépend de la source et du titre\n• L'abonnement Premium donne accès aux meilleures qualités disponibles\n\n**En cas de buffering ou de lag :**\n\n1. 🔄 **Rechargez le lecteur** — cliquez sur le bouton de rechargement\n2. 📡 **Vérifiez votre connexion** — une connexion stable est recommandée (minimum 5 Mbps pour HD)\n3. 📺 **Changez de source** — essayez un autre hébergeur (Vidzy, uqload, voe…)\n4. 📱 **Réduisez la qualité** — si votre connexion est limitée\n5. 🌐 **Fermez les autres onglets** — libérez de la bande passante\n\n**Si le problème persiste :**\n• Contactez **support@cinemax.local** en précisant le titre, la source et votre appareil\n• Indiquez si le problème est constant ou occasionnel\n\n💡 Les problèmes de qualité sont souvent liés à la source — n'hésitez pas à en essayer plusieurs.";
  }

  // Salutations
  if (lower.includes("bonjour") || lower.includes("salut") || lower.includes("hello") || lower.includes("hi") || lower.includes("bonsoir")) {
    return "👋 Bonjour ! Je suis l'assistant IA de CinéMax.\n\nComment puis-je vous aider aujourd'hui ? Voici quelques sujets que je peux couvrir :\n\n📋 **Compte** — inscription, connexion, mot de passe, profil\n⭐ **Premium** — abonnement, tarifs, paiement, annulation\n🎬 **Catalogue** — films, séries, animés, nouveautés\n🔍 **Recherche** — filtres, genres, navigation\n▶️ **Lecture** — lecteur, sources, langues, reprise\n❤️ **Favoris** — favoris, souhaits, historique\n📱 **Mobile** — utilisation sur téléphone\n🔧 **Support** — contact, aide, problèmes techniques\n\nPosez-moi votre question !";
  }

  if (lower.includes("merci") || lower.includes("thanks") || lower.includes("merci beaucoup")) {
    return "😊 De rien ! Je suis ravi de pouvoir vous aider.\n\nN'hésitez pas si vous avez d'autres questions — je suis là pour vous !\n\nPour une assistance personnalisée et détaillée, vous pouvez aussi :\n• 📧 Nous écrire à **support@cinemax.local**\n• 📝 Utiliser le formulaire de contact : /contact\n• ❓ Consulter la FAQ : /aide\n\nBonne visionnage sur CinéMax ! 🎬";
  }

  // Réponse par défaut
  return "🤔 Je n'ai pas trouvé de réponse précise à votre question, mais je peux vous aider sur de nombreux sujets :\n\n📋 **Compte** — inscription, connexion, mot de passe, profil\n⭐ **Premium** — abonnement, tarifs, paiement, annulation\n🎬 **Catalogue** — films, séries, animés, nouveautés\n🔍 **Recherche** — filtres, genres, navigation\n▶️ **Lecture** — lecteur, sources, langues, reprise\n❤️ **Favoris** — favoris, souhaits, historique\n🔔 **Notifications** — alertes et annonces\n🔗 **Partage** — partager des titres\n📱 **Mobile** — utilisation sur téléphone\n🎥 **Qualité** — dépannage vidéo\n⚖️ **Légal** — mentions, confidentialité, conditions\n🛡️ **Admin** — espace administrateur\n📞 **Support** — contact et aide\n\n💡 Essayez de reformuler votre question avec des mots-clés comme « compte », « premium », « lecture », « favoris », etc.\n\nPour une assistance personnalisée : **support@cinemax.local** ou /contact.";
}
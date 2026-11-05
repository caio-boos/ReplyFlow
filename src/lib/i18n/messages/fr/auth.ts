import type { Messages } from "../en";

const auth: Messages["auth"] = {
  meta: {
    login: "Se connecter — ReplyFlow",
    register: "Créer un compte — ReplyFlow",
  },
  shared: {
    rights: "© {year} ReplyFlow. Tous droits réservés.",
    emailLabel: "E-mail",
    emailPlaceholder: "admin@maboutique.com",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
  },
  login: {
    title: "Bon retour parmi nous",
    subtitle: "Accédez à votre tableau de bord",
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Pas encore de compte ?",
    createAccount: "Créer un compte gratuit",
    errors: {
      emailNotVerified: "E-mail non vérifié. Consultez votre boîte de réception.",
      invalidCredentials: "E-mail ou mot de passe incorrect",
      tooManyRequests: "Trop de tentatives. Patientez quelques minutes.",
      generic: "Connexion impossible. Veuillez réessayer.",
    },
    panel: {
      badge: "Protection active",
      titleLine1: "Votre passerelle.",
      titleLine2: "Protégée 24h/24, 7j/7.",
      body: "ReplyFlow traite chaque réclamation avant qu'elle ne devienne un chargeback. Un seul outil. Aucun e-mail oublié. Aucune suspension de passerelle.",
      stats: {
        chargebacks: "chargebacks évités",
        replyTime: "délai moyen de réponse",
        roi: "ROI moyen",
      },
      testimonial: {
        quote:
          "Mon Shopify Payments a été suspendu une fois. Avec ReplyFlow, mon taux de chargeback est tombé de 2,3 % à 0,4 % en six semaines. Plus aucun problème de passerelle depuis.",
        role: "Dropshipping · 800+ commandes/mois",
      },
    },
  },
  register: {
    title: "Créer un compte",
    subtitle: "Essai gratuit de {days} jours · Résiliez à tout moment",
    passwordPlaceholder: "8 caractères minimum",
    confirmPlaceholder: "Répétez le mot de passe",
    submit: "Créer un compte gratuit",
    submitting: "Création du compte…",
    hasAccount: "Vous avez déjà un compte ?",
    login: "Se connecter",
    errors: {
      passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      emailInUse: "Cet e-mail est déjà enregistré.",
      invalidEmail: "Adresse e-mail invalide.",
      weakPassword: "Mot de passe trop faible. Utilisez au moins 8 caractères.",
      generic: "Impossible de créer le compte. Veuillez réessayer.",
    },
    success: {
      title: "Vérifiez votre e-mail",
      body: "Nous avons envoyé un lien à <email>{email}</email>. Cliquez dessus pour activer votre compte. Ensuite, connectez-vous et choisissez votre forfait — les {days} premiers jours sont gratuits.",
      goToLogin: "Aller à la connexion",
    },
    panel: {
      badge: "Essai gratuit de {days} jours · Résiliez à tout moment",
      titleLine1: "Stoppez les chargebacks.",
      titleLine2: "Dès aujourd'hui.",
      body: "Connectez votre boîte mail en quelques minutes. ReplyFlow commence immédiatement à protéger votre passerelle — et récupère des paniers au passage.",
      features: {
        gateway: {
          title: "Protection de la passerelle",
          description:
            "Maintient votre taux de chargeback sous 1 % — le seuil qui déclenche les suspensions chez Shopify Payments, Stripe et PayPal.",
        },
        speed: {
          title: "Réponses en moins de 90 secondes",
          description:
            "Chaque demande de remboursement, réclamation de livraison et menace de litige reçoit une réponse automatique avant de dégénérer.",
        },
        carts: {
          title: "Récupération des paniers abandonnés",
          description:
            "Des relances personnalisées pour les paiements abandonnés. Pas d'envoi de masse — un vrai message qui reprend leur panier.",
        },
      },
      socialProof: "Adopté par des boutiques qui <highlight>ne peuvent pas se permettre une suspension de passerelle</highlight>",
    },
  },
  invite: {
    unavailableTitle: "Invitation indisponible",
    goToLogin: "Aller à la connexion",
    title: "Activez votre accès",
    subtitle: "Créez un mot de passe pour vous connecter en tant que <strong>{email}</strong>.",
    stores: "Boutiques :",
    access: "Accès :",
    nameLabel: "Votre nom",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    submit: "Créer le mot de passe et se connecter",
    submitting: "Activation…",
    errors: {
      invalid: "Invitation invalide.",
      passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      activateFailed: "Impossible d'activer l'accès.",
      existingAccount: "Un compte existe déjà avec cet e-mail. Connectez-vous avec votre mot de passe actuel.",
      generic: "Impossible de terminer. Veuillez réessayer.",
    },
  },
  noAccess: {
    subscription: {
      title: "Abonnement du compte inactif",
      body: "Le responsable du compte doit activer ou régulariser l'abonnement. Dès que ce sera fait, votre accès sera rétabli automatiquement.",
    },
    plan: {
      title: "Espace non inclus dans le forfait actuel",
      body: "Cet espace n'est pas inclus dans le forfait du compte. Demandez au responsable de passer à un forfait supérieur si vous en avez besoin.",
    },
    none: {
      title: "Aucun espace autorisé",
      body: "Votre accès n'a encore aucune autorisation. Demandez au responsable du compte d'activer les espaces dont vous avez besoin.",
    },
    backToDashboard: "Retour au tableau de bord",
    backToLogin: "Retour à la connexion",
  },
  api: {
    invalidToken: "Jeton invalide",
    emailNotVerified: "E-mail non vérifié. Consultez votre boîte de réception et cliquez sur le lien de confirmation.",
    invalidCredentials: "Identifiants invalides",
    inviteInvalid: "Invitation invalide.",
    inviteUsed: "Invitation invalide ou déjà utilisée.",
    inviteExpired: "Cette invitation a expiré.",
    passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
    emailInOtherTeam: "Cet e-mail appartient déjà à une autre équipe. Utilisez une autre adresse e-mail.",
  },
};

export default auth;

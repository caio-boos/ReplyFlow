import type { Messages } from "../en";

const landing: Messages["landing"] = {
  meta: {
    title: "ReplyFlow — Réponses e-mail automatiques par IA pour boutiques Shopify",
    description:
      "Répondez aux demandes de remboursement, réclamations de livraison et menaces de litige en moins de 90 secondes grâce à l'IA. Évitez les chargebacks.",
  },
  nav: {
    features: "Fonctionnalités",
    howItWorks: "Comment ça marche",
    pricing: "Tarifs",
    login: "Se connecter",
    getStarted: "Commencer gratuitement",
    toggleMenu: "Ouvrir le menu",
  },
  hero: {
    badge: "Stoppe les chargebacks. Récupère les paniers. Répond en 90 s.",
    titleLine1: "Une réclamation ignorée.",
    titleLine2: "Une passerelle suspendue.",
    subtitle:
      "Shopify Payments vous coupe à partir de 1 % de chargebacks. Stripe aussi. PayPal aussi. ReplyFlow répond à chaque demande de remboursement, réclamation de livraison et menace de litige en moins de 90 secondes. Avant que cela ne devienne un chargeback. Il récupère aussi les paniers abandonnés pour que vous arrêtiez de perdre de l'argent.",
    ctaPrimary: "Protéger mon compte",
    ctaSecondary: "Voir comment ça marche",
    socialProof: "Utilisé par des boutiques qui ne peuvent pas se permettre de perdre leur passerelle de paiement",
  },
  flow: {
    inbox: "Boîte de réception · support@boutique.com",
    minutesAgo: "il y a {count} min",
    emails: {
      whereIsOrder: "Où est ma commande ?",
      damaged: "Produit arrivé endommagé",
      newOrder: "Nouvelle commande #4821",
      refund: "Je veux un remboursement",
    },
    replySent: "Réponse automatique envoyée · {time}",
    reply: {
      greeting:
        "Bonjour Jessica, merci de nous avoir contactés. J'ai vérifié votre commande #4729 : elle est en cours d'acheminement avec le numéro de suivi <code>BR4829201</code>...",
      eta: "Votre colis devrait arriver d'ici le <date>mercredi 7 août</date>. Si vous ne l'avez pas reçu à cette date, nous vous enverrons immédiatement un remplacement.",
      signoff: "Cordialement,",
      team: "L'équipe de la boutique",
    },
    outcome: "Risque de chargeback traité · Tâche créée",
  },
  stats: {
    chargebacks: "des chargebacks stoppés avant d'être déposés auprès de la banque",
    automated: "des e-mails de support traités sans aucune intervention humaine",
    replyTime: "délai moyen entre la réclamation reçue et la réponse envoyée",
    roi: "ROI moyen des boutiques qui combinent prévention des chargebacks et récupération de paniers",
  },
  features: {
    eyebrow: "Fonctionnalités",
    title: "Stoppe les chargebacks. Récupère les paniers. Garde votre passerelle active.",
    items: {
      aiReplies: {
        title: "Des réponses IA qu'on croirait écrites par vous",
        description:
          "GPT-4o lit chaque message précédent et les détails de la commande avant de répondre. Vos clients ne sauront pas que c'est automatisé. Vous serez surpris de voir combien vous remercient.",
      },
      gateway: {
        title: "Protection de la passerelle de paiement",
        description:
          "Shopify Payments, Stripe et PayPal coupent tout au-delà de 1 % de chargebacks. L'IA désamorce chaque menace avant qu'elle ne devienne un litige. Votre taux reste propre.",
      },
      shopify: {
        title: "Intégration Shopify native",
        description:
          "Une connexion OAuth en un clic intègre à chaque réponse les données de commande en temps réel, les numéros de suivi et les détails produits. Sans copier-coller. Sans changer d'onglet.",
      },
      escalation: {
        title: "Escalade intelligente",
        description:
          "Quand un cas nécessite un humain, une tâche est créée automatiquement. Remboursements acceptés, menaces juridiques, changements d'adresse. Vous ne voyez que ce qui a vraiment besoin de vous.",
      },
      anyProvider: {
        title: "Compatible avec tous les fournisseurs e-mail",
        description:
          "IMAP/SMTP standard. Gmail, Outlook, Zoho, Hostinger, Titan. Si votre boutique l'utilise déjà, ReplyFlow peut le surveiller.",
      },
      cartRecovery: {
        title: "Récupération des paniers abandonnés",
        description:
          "Paiement abandonné ? ReplyFlow relance le client avec un e-mail personnalisé qui reprend son vrai panier. Pas d'envoi de masse générique. Un vrai message.",
      },
    },
  },
  howItWorks: {
    eyebrow: "Comment ça marche",
    title: "Configuré en 10 minutes. Votre compte protégé dès aujourd'hui.",
    steps: {
      connect: {
        title: "Connectez votre boîte mail et Shopify",
        description:
          "Ajoutez vos identifiants IMAP/SMTP et associez Shopify en un clic. Sans code, sans webhooks, sans attendre de validation.",
        detail: "Gmail, Outlook, Zoho, Hostinger, Titan. Tout fournisseur IMAP.",
      },
      intercept: {
        title: "L'IA intercepte les réclamations avant qu'elles ne dégénèrent",
        description:
          "Chaque menace de remboursement, réclamation de livraison ou e-mail mécontent reçoit une réponse contextuelle en moins de 90 secondes. Avant que le client n'ouvre un litige auprès de sa banque.",
        detail: "Boîte vérifiée toutes les 2 minutes. Les réponses partent de votre propre adresse.",
      },
      carts: {
        title: "Les paniers abandonnés reviennent",
        description:
          "ReplyFlow relance aussi les paiements abandonnés avec un message personnalisé qui reprend le vrai panier du client. Pas un envoi de masse. Un vrai e-mail.",
        detail: "Des tâches créées uniquement quand un cas nécessite vraiment un humain.",
      },
    },
  },
  testimonials: {
    eyebrow: "Ce que disent nos clients",
    title: "Passerelle sauvée. Revenus récupérés.",
    items: {
      mateus: {
        quote:
          "Mon Shopify Payments a été suspendu une fois. Il y a deux ans. Je suis passé à ReplyFlow et mon taux de chargeback est tombé de 2,3 % à 0,4 % en six semaines. Plus aucun problème de passerelle depuis.",
        role: "Propriétaire d'une boutique en dropshipping, plus de 800 commandes/mois",
      },
      larissa: {
        quote:
          "La récupération de paniers rembourse à elle seule le forfait. 4 200 $ de commandes récupérées les 30 premiers jours. J'ai failli désactiver cette fonctionnalité par erreur.",
        role: "Responsable e-commerce, marque de mode",
      },
      david: {
        quote:
          "Connecté en 10 minutes. Il connaissait déjà le numéro de commande, le statut de livraison et l'historique du client. Les réponses me ressemblent parfaitement. Les clients ne se doutent de rien.",
        role: "Fondateur, boutique d'électronique",
      },
    },
  },
  pricing: {
    eyebrow: "Tarifs",
    title: "Des prix fixes. Aucune surprise.",
    subtitle: "Essai gratuit de {days} jours sur tous les forfaits. Rien n'est débité aujourd'hui — résiliez à tout moment.",
    mostPopular: "Le plus populaire",
    perMonth: "/mois",
    yearly: "ou {price}/mois facturé annuellement (économisez {percent} %)",
    cta: "Démarrer l'essai gratuit de {days} jours",
    plans: {
      starter: {
        description: "Pour les boutiques qui veulent stopper les chargebacks sans embaucher de support.",
      },
      growth: {
        description: "Pour les marques en croissance confrontées à un fort volume de support.",
      },
      scale: {
        description: "Pour les opérateurs multi-boutiques qui ne peuvent se permettre aucune interruption.",
      },
    },
    features: {
      stores: "{count, plural, one {# boutique} other {# boutiques}}",
      unlimitedStores: "Boutiques illimitées",
      aiReplies: "{count} réponses IA/mois",
      shopify: "Intégration Shopify",
      taskQueue: "File de tâches + alertes de chargeback",
      emailSupport: "Support par e-mail",
      cartRecovery: "Récupération des paniers abandonnés",
      analytics: "Statistiques de support",
      advertorials: "Publireportages",
      prioritySupport: "Support prioritaire",
      everythingInGrowth: "Tout le forfait Growth",
      videoTools: "Outils vidéo IA",
      unlimitedMembers: "Membres d'équipe illimités",
      onboarding: "Onboarding dédié",
    },
  },
  cta: {
    badge: "Essai gratuit de {days} jours. Résiliez à tout moment.",
    titleLine1: "Votre passerelle ne peut pas",
    titleLine2: "compter sur la chance.",
    body: "Chaque réclamation sans réponse est un chargeback potentiel. Chaque chargeback au-delà de 1 % met en danger votre compte Shopify Payments, Stripe ou PayPal. ReplyFlow s'en charge automatiquement et récupère au passage les paniers abandonnés.",
    primary: "Protéger mon compte",
    login: "J'ai déjà un compte →",
  },
  footer: {
    rights: "© {year} ReplyFlow. Tous droits réservés.",
  },
};

export default landing;

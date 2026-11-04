import type { Messages } from "../en";

const shell: Messages["shell"] = {
  nav: {
    sections: {
      tools: "Outils",
      team: "Équipe",
    },
    items: {
      dashboard: "Dashboard",
      conversations: "Conversations",
      tasks: "Tâches",
      notes: "Notes",
      customers: "Clients",
      remarketing: "Remarketing",
      templates: "Modèles",
      advertorials: "Publireportages",
      composeEmail: "Rédiger un e-mail",
      watermark: "Supprimer le filigrane",
      videoClone: "Cloner une vidéo avec l'IA",
      members: "Membres",
    },
    locked: {
      title: "Disponible avec le forfait {plan}",
      titleFallback: "Disponible avec un forfait supérieur",
      badgeFallback: "Upgrade",
    },
    profile: "Profil",
    settings: "Paramètres",
  },
  mobile: {
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },
  stores: {
    all: "Toutes les boutiques",
    count: "{count, plural, =0 {Aucune boutique} one {# boutique} other {# boutiques}}",
  },
  pagination: {
    label: "Pagination",
    previous: "Page précédente",
    next: "Page suivante",
    page: "Page {page}",
  },
  billing: {
    retryLater: "Veuillez réessayer dans quelques instants.",
    subscriptionRequired: "Choisissez un forfait pour continuer.",
    planUpgradeRequired: "Cette fonctionnalité n'est pas incluse dans votre forfait.",
    readonlyOwner:
      "Votre compte est en lecture seule. Régularisez votre abonnement pour pouvoir modifier à nouveau.",
    readonlyMember:
      "L'abonnement de ce compte est inactif. Prévenez le responsable du compte.",
  },
};

export default shell;

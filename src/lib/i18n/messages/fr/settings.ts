import type { Messages } from "../en";

const settings: Messages["settings"] = {
  panel: {
    title: "Paramètres",
    subtitle: "Gérez votre compte et vos préférences",
    close: "Fermer les paramètres",
    emailAccounts: "Comptes e-mail",
  },
  appearance: {
    title: "Apparence",
    description: "Choisissez le thème de l'interface",
    dark: {
      title: "Mode sombre",
      description: "Interface sur fond sombre",
    },
    light: {
      title: "Mode clair",
      description: "Interface sur fond clair",
    },
  },
  stores: {
    title: "Boutiques connectées",
    description: "Gérez vos intégrations Shopify",
    newAccount: "Nouveau compte",
    emptyTitle: "Aucune boutique connectée",
    emptyDescription: "Connectez votre boutique Shopify pour commencer à utiliser ReplyFlow",
    connectShopify: "Connecter une boutique Shopify",
    connectNew: "Connecter une nouvelle boutique",
    connectNewDescription: "Ajoutez une autre boutique Shopify à ReplyFlow",
  },
  aiContext: {
    title: "Contexte IA",
    description: "Configurez le ton et le comportement des réponses automatiques",
    linkTitle: "Prompt et ton",
    linkDescription: "Personnalisez la façon dont l'IA répond à vos clients",
  },
  cartRecovery: {
    title: "Récupération de paniers",
    description: "Campagnes automatiques pour les paniers abandonnés",
    linkTitle: "Campagnes de remarketing",
    linkDescription: "Suivez et configurez la récupération des paniers abandonnés",
  },
  notifications: {
    title: "Notifications",
    description: "Soyez averti lorsqu'un client que vous suivez répond",
    emailTitle: "E-mail de notification",
    emailDescription:
      "Vous recevez une alerte lorsqu'une réponse arrive d'un client ayant une note ouverte ou à un e-mail envoyé via Rédiger un e-mail.",
    sendingTo: "Envoi à : <email>{email}</email>",
    status: {
      active: "Actif",
      notConfigured: "Non configuré",
    },
    placeholder: "vous@email.com",
    placeholderReplace: "Remplacer l'e-mail…",
    disable: "Désactiver",
    saved: "E-mail de notification enregistré.",
    footer:
      "La notification est envoyée depuis le compte e-mail de la boutique qui a reçu la réponse, avec un lien direct vers la conversation.",
    errors: {
      saveFailed: "Échec de l'enregistrement",
      invalidEmail: "Saisissez une adresse e-mail valide.",
    },
  },
  integrations: {
    title: "Intégrations IA",
    description: "Clés utilisées par les outils vidéo",
    replicateDescription: "Suppression de filigrane par IA · ~0,03 US$ par vidéo",
    billedAccount: "Compte facturé : <user>{username}</user>",
    status: {
      connected: "Connecté",
      fromEnv: "Via une variable d'environnement",
      notConfigured: "Non configuré",
    },
    placeholderReplace: "Remplacer le token…",
    help: "Générez-le sur <link>replicate.com/account/api-tokens</link>. Le token est vérifié puis stocké chiffré — il n'est plus jamais affiché.",
    toast: {
      connected: "Token connecté ({username}).",
      removed: "Token supprimé.",
    },
    errors: {
      saveFailed: "Échec de l'enregistrement.",
      tokenRequired: "Saisissez le token.",
      invalidToken: "Token invalide.",
    },
  },
  context: {
    title: "Contexte de l'IA",
    description:
      "Chaque compte e-mail possède son propre contexte. L'IA utilise le contexte du compte qui a reçu le message pour générer la réponse.",
    account: "Compte :",
    tip: "<strong>Astuce pour réduire les chargebacks :</strong> Indiquez vos délais de livraison, votre politique de remboursement et d'autres moyens de contact. L'IA utilisera ces informations pour proposer des solutions avant que le client ne contacte sa banque.",
    characters: "{count, plural, one {# caractère} other {# caractères}}",
    placeholder:
      "Décrivez votre boutique, vos produits, votre politique d'échange, vos délais de livraison, comment répondre aux réclamations de chargeback...",
    saved: "Enregistré",
    save: "Enregistrer le contexte",
    errors: {
      accountRequired: "Sélectionnez un compte.",
      textRequired: "Le contexte ne peut pas être vide.",
      accountNotFound: "Compte introuvable.",
    },
  },
  admin: {
    noStores: "Aucune boutique trouvée.",
    linked:
      "{count, plural, one {# e-mail associé} other {# e-mails associés}} aux conversations des clients.",
    nothingToLink: "Aucun e-mail en attente d'association.",
    noUnownedAccounts: "Aucun compte sans propriétaire trouvé.",
    invalidAction: "Action invalide.",
  },
};

export default settings;

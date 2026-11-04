const settings = {
  panel: {
    title: "Settings",
    subtitle: "Manage your account and preferences",
    close: "Close settings",
    emailAccounts: "Email Accounts",
  },
  appearance: {
    title: "Appearance",
    description: "Choose the interface theme",
    dark: {
      title: "Dark mode",
      description: "Interface with a dark background",
    },
    light: {
      title: "Light mode",
      description: "Interface with a light background",
    },
  },
  stores: {
    title: "Connected stores",
    description: "Manage your Shopify integrations",
    newAccount: "New account",
    emptyTitle: "No stores connected",
    emptyDescription: "Connect your Shopify store to start using ReplyFlow",
    connectShopify: "Connect Shopify store",
    connectNew: "Connect a new store",
    connectNewDescription: "Add another Shopify store to ReplyFlow",
  },
  aiContext: {
    title: "AI context",
    description: "Set the tone of voice and behavior of automatic replies",
    linkTitle: "Prompt and tone of voice",
    linkDescription: "Customize how the AI replies to your customers",
  },
  cartRecovery: {
    title: "Cart recovery",
    description: "Automated campaigns for abandoned carts",
    linkTitle: "Remarketing campaigns",
    linkDescription: "Track and configure abandoned cart recovery",
  },
  notifications: {
    title: "Notifications",
    description: "Get alerted when a customer you're following replies",
    emailTitle: "Notification email",
    emailDescription:
      "You'll get an alert when a reply arrives from a customer with an open note, or to an email sent with Compose Email.",
    sendingTo: "Sending to: <email>{email}</email>",
    status: {
      active: "Active",
      notConfigured: "Not configured",
    },
    placeholder: "you@email.com",
    placeholderReplace: "Replace email…",
    disable: "Disable",
    saved: "Notification email saved successfully.",
    footer:
      "The notification is sent from the email account of the store that received the reply, with a direct link to the conversation.",
    errors: {
      saveFailed: "Failed to save",
      invalidEmail: "Enter a valid email address.",
    },
  },
  integrations: {
    title: "AI integrations",
    description: "Keys used by the video tools",
    replicateDescription: "AI watermark removal · ~US$ 0.03 per video",
    billedAccount: "Billed account: <user>{username}</user>",
    status: {
      connected: "Connected",
      fromEnv: "Via environment variable",
      notConfigured: "Not configured",
    },
    placeholderReplace: "Replace token…",
    help: "Generate one at <link>replicate.com/account/api-tokens</link>. The token is validated and stored encrypted — it's never displayed again.",
    toast: {
      connected: "Token connected ({username}).",
      removed: "Token removed.",
    },
    errors: {
      saveFailed: "Failed to save.",
      tokenRequired: "Enter the token.",
      invalidToken: "Invalid token.",
    },
  },
  context: {
    title: "AI context",
    description:
      "Each email account has its own context. The AI uses the context of the account that received the message to generate the reply.",
    account: "Account:",
    tip: "<strong>Tip to reduce chargebacks:</strong> Mention your delivery times, refund policy and alternative contact channels. The AI will use this information to offer solutions before the customer contacts their bank.",
    characters: "{count, plural, one {# character} other {# characters}}",
    placeholder:
      "Describe your store, products, exchange policy, delivery times, how to handle chargeback complaints...",
    saved: "Saved successfully",
    save: "Save context",
    errors: {
      accountRequired: "Select an account.",
      textRequired: "The context can't be empty.",
      accountNotFound: "Account not found.",
    },
  },
  admin: {
    noStores: "No stores found.",
    linked:
      "{count, plural, one {# email linked} other {# emails linked}} to customer conversations.",
    nothingToLink: "No emails pending linking.",
    noUnownedAccounts: "No unowned accounts found.",
    invalidAction: "Invalid action.",
  },
};

export default settings;

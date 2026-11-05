const landing = {
  meta: {
    title: "ReplyFlow — AI Email Auto-Reply for Shopify Stores",
    description:
      "ReplyFlow answers refund requests, delivery complaints and dispute threats in under 90 seconds with AI. Prevent chargebacks and recover abandoned carts on Shopify.",
  },
  nav: {
    features: "Features",
    howItWorks: "How it works",
    pricing: "Pricing",
    login: "Log in",
    getStarted: "Get started free",
    toggleMenu: "Toggle menu",
  },
  hero: {
    badge: "Stops chargebacks. Recovers carts. Replies in 90s.",
    titleLine1: "One complaint ignored.",
    titleLine2: "One gateway suspended.",
    subtitle:
      "Shopify Payments cuts you off at 1% chargeback rate. Stripe does too. PayPal too. ReplyFlow replies to every refund request, delivery complaint, and dispute threat in under 90 seconds. Before it becomes a filed chargeback. It also recovers abandoned carts so you stop leaving money on the table.",
    ctaPrimary: "Protect my account",
    ctaSecondary: "See how it works",
    socialProof: "Used by stores that can't afford to lose their payment gateway",
  },
  flow: {
    inbox: "Inbox · support@store.com",
    minutesAgo: "{count}m ago",
    emails: {
      whereIsOrder: "Where is my order?",
      damaged: "Product arrived damaged",
      newOrder: "New order #4821",
      refund: "I want a refund",
    },
    replySent: "Auto-reply sent · {time}",
    reply: {
      greeting:
        "Hi Jessica, thank you for reaching out. I've checked your order #4729 and it's currently in transit with tracking number <code>BR4829201</code>...",
      eta: "Your package is expected to arrive by <date>Wednesday, Aug 7</date>. If you don't receive it by then, we'll send a replacement right away.",
      signoff: "Best regards,",
      team: "The Store Team",
    },
    outcome: "Chargeback risk addressed · Task created",
  },
  stats: {
    chargebacks: "of chargebacks stopped before they're filed with the bank",
    automated: "of support emails handled with zero human input",
    replyTime: "average time from incoming complaint to reply sent",
    roi: "average ROI for stores using chargeback prevention plus cart recovery",
  },
  features: {
    eyebrow: "Features",
    title: "Stops chargebacks. Recovers carts. Keeps your gateway alive.",
    items: {
      aiReplies: {
        title: "AI replies that sound like you wrote them",
        description:
          "GPT-4o reads every previous message and order detail before writing a reply. Customers won't know it's automated. You'd be surprised how often they say thanks.",
      },
      gateway: {
        title: "Payment gateway protection",
        description:
          "Shopify Payments, Stripe, and PayPal all pull the plug above 1% chargeback rate. The AI de-escalates every threat before it becomes a filed dispute. Your rate stays clean.",
      },
      shopify: {
        title: "Native Shopify integration",
        description:
          "One-click OAuth pulls live order data, tracking numbers, and product details into every reply. No copy-pasting. No tab-switching.",
      },
      escalation: {
        title: "Smart escalation",
        description:
          "When a case needs a human, it creates a task automatically. Accepted refunds, legal threats, address changes. You only see what actually needs you.",
      },
      anyProvider: {
        title: "Works with any email provider",
        description:
          "Standard IMAP/SMTP. Gmail, Outlook, Zoho, Hostinger, Titan. If your store already uses it, ReplyFlow can monitor it.",
      },
      cartRecovery: {
        title: "Abandoned cart recovery",
        description:
          "Abandoned checkout? ReplyFlow follows up with a personalized email referencing the customer's actual cart. Not a generic blast. A real message.",
      },
    },
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "Set up in 10 minutes. Protecting your account today.",
    steps: {
      connect: {
        title: "Connect your inbox and Shopify",
        description:
          "Add your IMAP/SMTP credentials and link Shopify in one click. No code, no webhooks, no waiting for approval.",
        detail: "Gmail, Outlook, Zoho, Hostinger, Titan. Any IMAP provider.",
      },
      intercept: {
        title: "AI intercepts complaints before they escalate",
        description:
          "Every refund threat, delivery complaint, and angry email gets a contextual reply in under 90 seconds. Before the customer opens a dispute with their bank.",
        detail: "Inbox checked every 2 minutes. Replies go out from your own address.",
      },
      carts: {
        title: "Abandoned carts come back",
        description:
          "ReplyFlow also follows up on abandoned checkouts with a personalized message referencing the customer's actual cart. Not a blast. A real email.",
        detail: "Tasks created only when a case actually needs a human.",
      },
    },
  },
  testimonials: {
    eyebrow: "What our customers say",
    title: "Gateway saved. Revenue recovered.",
    items: {
      mateus: {
        quote:
          "My Shopify Payments got suspended once. Two years ago. I switched to ReplyFlow, dropped from 2.3% to 0.4% chargeback rate in six weeks. Haven't had a gateway issue since.",
        role: "Dropshipping store owner, 800+ orders/month",
      },
      larissa: {
        quote:
          "The cart recovery alone pays for the plan. $4,200 in recovered orders in the first 30 days. I almost turned that feature off by accident.",
        role: "E-commerce manager, Fashion brand",
      },
      david: {
        quote:
          "Took 10 minutes to connect. It already knew the order number, delivery status, and customer history. The replies sound exactly like me. Customers never suspect a thing.",
        role: "Founder, Electronics store",
      },
    },
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Flat pricing. No surprises.",
    subtitle: "{days}-day free trial on every plan. Nothing charged today — cancel anytime.",
    mostPopular: "Most popular",
    perMonth: "/month",
    yearly: "or {price}/mo billed yearly (save {percent}%)",
    cta: "Start {days}-day free trial",
    plans: {
      starter: {
        description: "For stores that need to stop chargebacks without hiring support.",
      },
      growth: {
        description: "For growing brands getting hit with high support volume.",
      },
      scale: {
        description: "For multi-store operators who can't afford any downtime.",
      },
    },
    features: {
      stores: "{count, plural, one {# store} other {# stores}}",
      unlimitedStores: "Unlimited stores",
      aiReplies: "{count} AI replies/mo",
      shopify: "Shopify integration",
      taskQueue: "Task queue + chargeback flags",
      emailSupport: "Email support",
      cartRecovery: "Abandoned cart recovery",
      analytics: "Support analytics",
      advertorials: "Advertorials",
      prioritySupport: "Priority support",
      everythingInGrowth: "Everything in Growth",
      videoTools: "AI video tools",
      unlimitedMembers: "Unlimited team members",
      onboarding: "Dedicated onboarding",
    },
  },
  cta: {
    badge: "{days}-day free trial. Cancel anytime.",
    titleLine1: "Your gateway can't",
    titleLine2: "run on luck.",
    body: "Every unanswered complaint is a potential chargeback. Every chargeback above 1% risks your Shopify Payments, Stripe, or PayPal account. ReplyFlow handles it automatically and recovers abandoned carts along the way.",
    primary: "Protect my account",
    login: "Already have an account →",
  },
  footer: {
    rights: "© {year} ReplyFlow. All rights reserved.",
  },
};

export default landing;

const auth = {
  meta: {
    login: "Log in — ReplyFlow",
    register: "Create your account — ReplyFlow",
  },
  shared: {
    rights: "© {year} ReplyFlow. All rights reserved.",
    emailLabel: "Email",
    emailPlaceholder: "admin@yourstore.com",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your dashboard",
    submit: "Log in",
    submitting: "Logging in…",
    noAccount: "Don't have an account?",
    createAccount: "Create a free account",
    errors: {
      emailNotVerified: "Email not verified. Check your inbox.",
      invalidCredentials: "Incorrect email or password",
      tooManyRequests: "Too many attempts. Please wait a few minutes.",
      generic: "Couldn't log in. Please try again.",
    },
    panel: {
      badge: "Active protection",
      titleLine1: "Your gateway.",
      titleLine2: "Protected 24/7.",
      body: "ReplyFlow handles every complaint before it becomes a chargeback. One tool. No missed emails. No gateway suspensions.",
      stats: {
        chargebacks: "chargebacks stopped",
        replyTime: "avg. reply time",
        roi: "avg. ROI",
      },
      testimonial: {
        quote:
          "My Shopify Payments got suspended once. After ReplyFlow, I dropped from 2.3% to 0.4% chargeback rate in six weeks. Haven't had a gateway issue since.",
        role: "Dropshipping · 800+ orders/mo",
      },
    },
  },
  register: {
    title: "Create account",
    subtitle: "{days}-day free trial · Cancel anytime",
    passwordPlaceholder: "At least 8 characters",
    confirmPlaceholder: "Repeat your password",
    submit: "Create free account",
    submitting: "Creating account…",
    hasAccount: "Already have an account?",
    login: "Log in",
    errors: {
      passwordTooShort: "Password must be at least 8 characters.",
      passwordMismatch: "Passwords don't match.",
      emailInUse: "This email is already registered.",
      invalidEmail: "Invalid email address.",
      weakPassword: "Password is too weak. Use at least 8 characters.",
      generic: "Couldn't create your account. Please try again.",
    },
    success: {
      title: "Check your email",
      body: "We sent a link to <email>{email}</email>. Click it to activate your account. Then just log in and choose your plan — your first {days} days are free.",
      goToLogin: "Go to login",
    },
    panel: {
      badge: "{days}-day free trial · Cancel anytime",
      titleLine1: "Stop chargebacks.",
      titleLine2: "Start today.",
      body: "Connect your inbox in minutes. ReplyFlow starts protecting your gateway immediately — and recovering carts on the side.",
      features: {
        gateway: {
          title: "Gateway protection",
          description:
            "Keeps your chargeback rate below 1% — the limit that triggers Shopify Payments, Stripe, and PayPal suspensions.",
        },
        speed: {
          title: "Replies in under 90 seconds",
          description:
            "Every refund request, delivery complaint, and dispute threat answered automatically before it escalates.",
        },
        carts: {
          title: "Abandoned cart recovery",
          description:
            "Personalized follow-ups on abandoned checkouts. Not a blast — a real message referencing their actual cart.",
        },
      },
      socialProof: "Joined by stores that <highlight>can't afford gateway suspensions</highlight>",
    },
  },
  invite: {
    unavailableTitle: "Invite unavailable",
    goToLogin: "Go to login",
    title: "Activate your access",
    subtitle: "Create a password to sign in as <strong>{email}</strong>.",
    stores: "Stores:",
    access: "Access:",
    nameLabel: "Your name",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    submit: "Create password and sign in",
    submitting: "Activating…",
    errors: {
      invalid: "Invalid invite.",
      passwordTooShort: "Password must be at least 8 characters.",
      passwordMismatch: "Passwords don't match.",
      activateFailed: "Couldn't activate your access.",
      existingAccount: "An account with this email already exists. Log in with your current password.",
      generic: "Couldn't finish. Please try again.",
    },
  },
  noAccess: {
    subscription: {
      title: "Account subscription inactive",
      body: "The account owner needs to activate or update this account's subscription. As soon as that happens, your access will be restored automatically.",
    },
    plan: {
      title: "Area not included in the current plan",
      body: "This area isn't included in the account's plan. Ask the account owner to upgrade if you need it.",
    },
    none: {
      title: "No areas enabled",
      body: "Your access doesn't have any permissions assigned yet. Ask the account owner to enable the areas you need.",
    },
    backToDashboard: "Back to dashboard",
    backToLogin: "Back to login",
  },
  api: {
    invalidToken: "Invalid token",
    emailNotVerified: "Email not verified. Check your inbox and click the confirmation link.",
    invalidCredentials: "Invalid credentials",
    inviteInvalid: "Invalid invite.",
    inviteUsed: "This invite is invalid or has already been used.",
    inviteExpired: "This invite has expired.",
    passwordTooShort: "Password must be at least 8 characters.",
    emailInOtherTeam: "This email already belongs to another team. Use a different email address.",
  },
};

export default auth;

const shell = {
  nav: {
    sections: {
      tools: "Tools",
      team: "Team",
    },
    items: {
      dashboard: "Dashboard",
      conversations: "Conversations",
      tasks: "Tasks",
      notes: "Notes",
      customers: "Customers",
      remarketing: "Remarketing",
      templates: "Templates",
      advertorials: "Advertorials",
      composeEmail: "Compose Email",
      watermark: "Remove Watermark",
      videoClone: "AI Video Clone",
      members: "Members",
    },
    locked: {
      title: "Available on the {plan} plan",
      titleFallback: "Available on a higher plan",
      badgeFallback: "Upgrade",
    },
    profile: "Profile",
    settings: "Settings",
  },
  mobile: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  stores: {
    all: "All stores",
    count: "{count, plural, =0 {No stores} one {# store} other {# stores}}",
  },
  pagination: {
    label: "Pagination",
    previous: "Previous page",
    next: "Next page",
    page: "Page {page}",
  },
  billing: {
    retryLater: "Please try again in a moment.",
    subscriptionRequired: "Choose a plan to continue.",
    planUpgradeRequired: "This feature isn't included in your plan.",
    readonlyOwner:
      "Your account is in read-only mode. Update your subscription to start editing again.",
    readonlyMember:
      "This account's subscription is inactive. Please let the account owner know.",
  },
};

export default shell;

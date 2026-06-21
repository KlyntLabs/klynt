export interface ProductItem {
  id: string;
  labelKey: string;
  icon: string;
  route: string;
  descriptionKey?: string;
  category: "analytics" | "data" | "debug" | "testing" | "feedback" | "automation";
}

export const products: ProductItem[] = [
  {
    id: "web-analytics",
    labelKey: "marketing:data.products.webAnalytics",
    icon: "Globe",
    route: "/web-analytics",
    category: "analytics",
  },
  {
    id: "product-analytics",
    labelKey: "marketing:data.products.productAnalytics",
    icon: "BarChart3",
    route: "/product-analytics",
    category: "analytics",
  },
  {
    id: "session-replay",
    labelKey: "marketing:data.products.sessionReplay",
    icon: "PlayCircle",
    route: "/session-replay",
    category: "analytics",
  },
  {
    id: "funnels",
    labelKey: "marketing:data.products.funnels",
    icon: "Filter",
    route: "/funnels",
    category: "analytics",
  },
  {
    id: "heatmaps",
    labelKey: "marketing:data.products.heatmaps",
    icon: "Flame",
    route: "/heatmaps",
    category: "analytics",
  },
  {
    id: "trends",
    labelKey: "marketing:data.products.graphsTrends",
    icon: "TrendingUp",
    route: "/trends",
    category: "analytics",
  },
  {
    id: "lifecycle",
    labelKey: "marketing:data.products.lifecycle",
    icon: "RotateCcw",
    route: "/lifecycle",
    category: "analytics",
  },
  {
    id: "user-paths",
    labelKey: "marketing:data.products.userPaths",
    icon: "GitBranch",
    route: "/user-paths",
    category: "analytics",
  },
  {
    id: "ai-evals",
    labelKey: "marketing:data.products.aiEvals",
    icon: "Bot",
    route: "/ai-observability",
    category: "analytics",
  },

  {
    id: "session-replay-debug",
    labelKey: "marketing:data.products.sessionReplay",
    icon: "PlayCircle",
    route: "/session-replay",
    descriptionKey: "marketing:data.productDescriptions.sessionReplay",
    category: "debug",
  },
  {
    id: "error-tracking",
    labelKey: "marketing:data.products.errorTracking",
    icon: "AlertTriangle",
    route: "/error-tracking",
    descriptionKey: "marketing:data.productDescriptions.errorTracking",
    category: "debug",
  },
  {
    id: "logs",
    labelKey: "marketing:data.products.logs",
    icon: "FileText",
    route: "/logs",
    descriptionKey: "marketing:data.productDescriptions.logs",
    category: "debug",
  },
  {
    id: "activity-timeline",
    labelKey: "marketing:data.products.activityTimeline",
    icon: "Clock",
    route: "/activity",
    descriptionKey: "marketing:data.productDescriptions.activityTimeline",
    category: "debug",
  },

  {
    id: "feature-flags",
    labelKey: "marketing:data.products.featureFlags",
    icon: "Flag",
    route: "/feature-flags",
    category: "testing",
  },
  {
    id: "experiments",
    labelKey: "marketing:data.products.experiments",
    icon: "Beaker",
    route: "/experiments",
    category: "testing",
  },
  {
    id: "ab-testing",
    labelKey: "marketing:data.products.abTesting",
    icon: "TestTube",
    route: "/experiments",
    category: "testing",
  },
  {
    id: "early-access",
    labelKey: "marketing:data.products.earlyAccess",
    icon: "Rocket",
    route: "/early-access",
    category: "testing",
  },

  {
    id: "endpoints",
    labelKey: "marketing:data.products.endpoints",
    icon: "Plug",
    route: "/endpoints",
    category: "automation",
  },
  {
    id: "webhooks",
    labelKey: "marketing:data.products.webhooks",
    icon: "Webhook",
    route: "/webhooks",
    category: "automation",
  },
  {
    id: "workflows",
    labelKey: "marketing:data.products.workflows",
    icon: "Workflow",
    route: "/workflows",
    category: "automation",
  },

  {
    id: "surveys",
    labelKey: "marketing:data.products.surveys",
    icon: "ClipboardList",
    route: "/surveys",
    category: "feedback",
  },
  {
    id: "support",
    labelKey: "marketing:data.products.support",
    icon: "LifeBuoy",
    route: "/support",
    category: "feedback",
  },
  {
    id: "user-interviews",
    labelKey: "marketing:data.products.userInterviews",
    icon: "Users",
    route: "/user-interviews",
    category: "feedback",
  },
];

export const tab1Products = products.filter((p) => p.category === "analytics");
export const tab3Products = products.filter((p) => p.category === "debug");
export const tab4FeatureDev = products.filter((p) => p.category === "testing");
export const tab4Automation = products.filter((p) => p.category === "automation");
export const tab4Feedback = products.filter((p) => p.category === "feedback");

export interface PricingCard {
  productKey: string;
  freeTierKey: string;
  paidRateKey: string;
  icon: string;
}

export const pricingCards: PricingCard[] = [
  {
    productKey: "marketing:data.products.productAnalytics",
    freeTierKey: "marketing:data.pricingCards.productAnalytics.freeTier",
    paidRateKey: "marketing:data.pricingCards.productAnalytics.paidRate",
    icon: "BarChart3",
  },
  {
    productKey: "marketing:data.products.sessionReplay",
    freeTierKey: "marketing:data.pricingCards.sessionReplay.freeTier",
    paidRateKey: "marketing:data.pricingCards.sessionReplay.paidRate",
    icon: "PlayCircle",
  },
  {
    productKey: "marketing:data.products.featureFlags",
    freeTierKey: "marketing:data.pricingCards.featureFlags.freeTier",
    paidRateKey: "marketing:data.pricingCards.featureFlags.paidRate",
    icon: "Flag",
  },
  {
    productKey: "marketing:data.products.experiments",
    freeTierKey: "marketing:data.pricingCards.experiments.freeTier",
    paidRateKey: "marketing:data.pricingCards.experiments.paidRate",
    icon: "Beaker",
  },
  {
    productKey: "marketing:data.products.surveys",
    freeTierKey: "marketing:data.pricingCards.surveys.freeTier",
    paidRateKey: "marketing:data.pricingCards.surveys.paidRate",
    icon: "ClipboardList",
  },
];

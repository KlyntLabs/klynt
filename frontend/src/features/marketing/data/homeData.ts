export interface ProductItem {
  id: string;
  labelKey: string;
  icon: string;
  route: string;
  descriptionKey?: string;
  category: "analytics" | "data" | "debug" | "testing" | "automation" | "feedback";
}

export const tab1Products: ProductItem[] = [
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
];

export const tab3Products: ProductItem[] = [
  {
    id: "session-replay-debug",
    labelKey: "marketing:data.products.sessionReplay",
    icon: "PlayCircleSmall",
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
];

export const tab4FeatureDev: ProductItem[] = [
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
];

export const tab4Automation: ProductItem[] = [
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
];

export const tab4Feedback: ProductItem[] = [
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
    icon: "BarChart3Small",
  },
  {
    productKey: "marketing:data.products.sessionReplay",
    freeTierKey: "marketing:data.pricingCards.sessionReplay.freeTier",
    paidRateKey: "marketing:data.pricingCards.sessionReplay.paidRate",
    icon: "PlayCircleSmall",
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

export interface Customer {
  id: string;
  name: string;
  logo: string;
  category: "vc" | "engineer";
}

export const vcCustomers: Customer[] = [
  { id: "ycombinator", name: "Y Combinator", logo: "Y Combinator", category: "vc" },
  { id: "airbus", name: "Airbus", logo: "Airbus", category: "vc" },
  {
    id: "national-design",
    name: "National Design Studio",
    logo: "National Design",
    category: "vc",
  },
  { id: "trust", name: "TRUST", logo: "TRUST", category: "vc" },
  { id: "govuk", name: "GOV.UK", logo: "GOV.UK", category: "vc" },
  { id: "lovable", name: "Lovable", logo: "Lovable", category: "vc" },
  { id: "startengine", name: "Startengine", logo: "Startengine", category: "vc" },
  { id: "researchgate", name: "ResearchGate", logo: "ResearchGate", category: "vc" },
  { id: "heygen", name: "HeyGen", logo: "HeyGen", category: "vc" },
];

export const engineerCustomers: Customer[] = [
  { id: "supabase", name: "Supabase", logo: "Supabase", category: "engineer" },
  { id: "mistral", name: "Mistral AI", logo: "Mistral AI", category: "engineer" },
  { id: "elevenlabs", name: "ElevenLabs", logo: "ElevenLabs", category: "engineer" },
  { id: "exa", name: "Exa", logo: "Exa", category: "engineer" },
  { id: "convex", name: "Convex", logo: "Convex", category: "engineer" },
  { id: "hasura", name: "Hasura", logo: "Hasura", category: "engineer" },
  { id: "raycast", name: "Raycast", logo: "Raycast", category: "engineer" },
  { id: "clerk", name: "Clerk", logo: "Clerk", category: "engineer" },
  { id: "resend", name: "Resend", logo: "Resend", category: "engineer" },
  { id: "grepitile", name: "Grepitile", logo: "Grepitile", category: "engineer" },
  { id: "flow", name: "Flow", logo: "Flow", category: "engineer" },
  { id: "paper", name: "Paper", logo: "Paper", category: "engineer" },
  { id: "posthog", name: "PostHog", logo: "PostHog", category: "engineer" },
];

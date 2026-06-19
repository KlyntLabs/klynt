// Product data for tabs
export interface ProductItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  description?: string;
  category: "analytics" | "data" | "debug" | "testing" | "automation" | "feedback";
}

// Tab 1: Understand product usage
export const tab1Products: ProductItem[] = [
  {
    id: "web-analytics",
    label: "Web Analytics",
    icon: "Globe",
    route: "/web-analytics",
    category: "analytics",
  },
  {
    id: "product-analytics",
    label: "Product Analytics",
    icon: "BarChart3",
    route: "/product-analytics",
    category: "analytics",
  },
  {
    id: "session-replay",
    label: "Session Replay",
    icon: "PlayCircle",
    route: "/session-replay",
    category: "analytics",
  },
  { id: "funnels", label: "Funnels", icon: "Filter", route: "/funnels", category: "analytics" },
  { id: "heatmaps", label: "Heatmaps", icon: "Flame", route: "/heatmaps", category: "analytics" },
  {
    id: "trends",
    label: "Graphs & trends",
    icon: "TrendingUp",
    route: "/trends",
    category: "analytics",
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    icon: "RotateCcw",
    route: "/lifecycle",
    category: "analytics",
  },
  {
    id: "user-paths",
    label: "User Paths",
    icon: "GitBranch",
    route: "/user-paths",
    category: "analytics",
  },
  {
    id: "ai-evals",
    label: "AI Evals",
    icon: "Bot",
    route: "/ai-observability",
    category: "analytics",
  },
];

// Tab 3: Debug & fix issues
export const tab3Products: ProductItem[] = [
  {
    id: "session-replay-debug",
    label: "Session Replay",
    icon: "PlayCircleSmall",
    route: "/session-replay",
    description: "Watch real user sessions",
    category: "debug",
  },
  {
    id: "error-tracking",
    label: "Error Tracking",
    icon: "AlertTriangle",
    route: "/error-tracking",
    description: "Track and resolve errors",
    category: "debug",
  },
  {
    id: "logs",
    label: "Logs",
    icon: "FileText",
    route: "/logs",
    description: "Centralized logging",
    category: "debug",
  },
  {
    id: "activity-timeline",
    label: "Activity timeline",
    icon: "Clock",
    route: "/activity",
    description: "Full user activity view",
    category: "debug",
  },
];

// Tab 4: Test & roll out changes
export const tab4FeatureDev: ProductItem[] = [
  {
    id: "feature-flags",
    label: "Feature Flags",
    icon: "Flag",
    route: "/feature-flags",
    category: "testing",
  },
  {
    id: "experiments",
    label: "Experiments",
    icon: "Beaker",
    route: "/experiments",
    category: "testing",
  },
  {
    id: "ab-testing",
    label: "No-code A/B Testing",
    icon: "TestTube",
    route: "/experiments",
    category: "testing",
  },
  {
    id: "early-access",
    label: "Early Access Features",
    icon: "Rocket",
    route: "/early-access",
    category: "testing",
  },
];

export const tab4Automation: ProductItem[] = [
  {
    id: "endpoints",
    label: "Endpoints",
    icon: "Plug",
    route: "/endpoints",
    category: "automation",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: "Webhook",
    route: "/webhooks",
    category: "automation",
  },
  {
    id: "workflows",
    label: "Workflows",
    icon: "Workflow",
    route: "/workflows",
    category: "automation",
  },
];

export const tab4Feedback: ProductItem[] = [
  {
    id: "surveys",
    label: "Surveys",
    icon: "ClipboardList",
    route: "/surveys",
    category: "feedback",
  },
  { id: "support", label: "Support", icon: "LifeBuoy", route: "/support", category: "feedback" },
  {
    id: "user-interviews",
    label: "User interviews",
    icon: "Users",
    route: "/user-interviews",
    category: "feedback",
  },
];

export const dataSources = [
  "Postgres",
  "Snowflake",
  "Salesforce",
  "Stripe",
  "Zendesk",
  "Google Ads",
  "Hubspot",
  "BigQuery",
  "Redshift",
  "MySQL",
  "GitHub",
  "MongoDB",
];

export const dataManageQuery = ["Data modeling", "SQL editor", "CDP", "Managed warehouse", "BI"];

export const dataExport = [
  "BigQuery",
  "Snowflake",
  "Amazon S3",
  "PostgresSQL",
  "Redshift",
  "Zapier",
  "Hubspot",
  "Intercom",
  "Customer.io",
  "Zendesk",
  "HTTP Webhook",
];

export const pricingCards = [
  {
    product: "Product Analytics",
    freeTier: "First 1M events free",
    paidRate: "From $0.00005/event",
    icon: "BarChart3Small",
  },
  {
    product: "Session Replay",
    freeTier: "5K recordings",
    paidRate: "$0.005/recording",
    icon: "PlayCircleSmall",
  },
  { product: "Feature Flags", freeTier: "1M requests", paidRate: "$0.0001/request", icon: "Flag" },
  { product: "Experiments", freeTier: "Billed with FF", paidRate: "(included)", icon: "Beaker" },
  {
    product: "Surveys",
    freeTier: "250 responses",
    paidRate: "$0.01/response",
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

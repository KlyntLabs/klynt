import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  ClipboardList,
  Code,
  Coffee,
  Database,
  DollarSign,
  Eye,
  FileText,
  Flag,
  FlaskConical,
  LayoutGrid,
  LineChart,
  MessageSquareText,
  Package,
  Plug,
  Puzzle,
  Radio,
  Search as SearchIcon,
  Settings,
  Slack,
  Sparkles,
  Star,
  Users,
  Video,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";

export interface DocCategory {
  name: string;
  items: DocItem[];
}

export interface DocItem {
  label: string;
  icon: LucideIcon;
  description?: string;
}

export const integrationCategories: DocCategory = {
  name: "Integration",
  items: [
    { label: "Install and configure", icon: Wrench, description: "Get started with PostHog" },
    { label: "SDKs", icon: Package, description: "Client libraries" },
    { label: "Frameworks", icon: LayoutGrid, description: "Framework integrations" },
    { label: "API", icon: Code, description: "REST API reference" },
    { label: "Advanced", icon: Settings, description: "Advanced configuration" },
    { label: "Getting HogPilled", icon: Sparkles, description: "Philosophy & culture" },
  ],
};

export const aiPlatformCategories: DocCategory = {
  name: "AI platform",
  items: [
    { label: "PostHog Code", icon: Coffee },
    { label: "PostHog AI", icon: Star },
    { label: "MCP", icon: Puzzle },
    { label: "AI wizard", icon: Wand2 },
    { label: "AI engineering", icon: Brain },
  ],
};

export const developerAppsCategories: DocCategory = {
  name: "Developer apps",
  items: [
    { label: "Product Analytics", icon: BarChart3 },
    { label: "Web Analytics", icon: LineChart },
    { label: "Session Replay", icon: Video },
    { label: "Replay Vision", icon: Eye },
    { label: "Feature Flags", icon: Flag },
    { label: "Experiments", icon: FlaskConical },
    { label: "Error Tracking", icon: AlertTriangle },
    { label: "Surveys", icon: ClipboardList },
    { label: "Support", icon: MessageSquareText },
    { label: "Data pipelines", icon: Database },
    { label: "Data Warehouse", icon: Database },
    { label: "AI Observability", icon: Bot },
    { label: "MCP Analytics", icon: Radio },
    { label: "Revenue Analytics", icon: DollarSign },
    { label: "Customer Analytics", icon: Users },
    { label: "Slack app", icon: Slack },
    { label: "Workflows", icon: Zap },
    { label: "Logs", icon: FileText },
    { label: "Distributed tracing", icon: SearchIcon },
    { label: "Endpoints", icon: Plug },
  ],
};

export const allDocCategories: DocCategory[] = [
  integrationCategories,
  aiPlatformCategories,
  developerAppsCategories,
];

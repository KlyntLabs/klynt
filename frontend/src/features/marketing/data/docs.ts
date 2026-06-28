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
  MessageSquare,
  MessageSquareText,
  Package,
  Plug,
  Puzzle,
  Radio,
  Search as SearchIcon,
  Settings,
  Sparkles,
  Star,
  Users,
  Video,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";

export interface DocCategory {
  nameKey: string;
  items: DocItem[];
}

export interface DocItem {
  labelKey: string;
  icon: LucideIcon;
  descriptionKey?: string;
}

export const integrationCategories: DocCategory = {
  nameKey: "marketing:docs.categories.integration",
  items: [
    {
      labelKey: "marketing:docs.items.installAndConfigure",
      icon: Wrench,
      descriptionKey: "marketing:docs.items.installAndConfigureDesc",
    },
    {
      labelKey: "marketing:docs.items.sdks",
      icon: Package,
      descriptionKey: "marketing:docs.items.sdksDesc",
    },
    {
      labelKey: "marketing:docs.items.frameworks",
      icon: LayoutGrid,
      descriptionKey: "marketing:docs.items.frameworksDesc",
    },
    {
      labelKey: "marketing:docs.items.api",
      icon: Code,
      descriptionKey: "marketing:docs.items.apiDesc",
    },
    {
      labelKey: "marketing:docs.items.advanced",
      icon: Settings,
      descriptionKey: "marketing:docs.items.advancedDesc",
    },
    {
      labelKey: "marketing:docs.items.gettingHogPilled",
      icon: Sparkles,
      descriptionKey: "marketing:docs.items.gettingHogPilledDesc",
    },
  ],
};

export const aiPlatformCategories: DocCategory = {
  nameKey: "marketing:docs.categories.aiPlatform",
  items: [
    { labelKey: "marketing:docs.items.klyntCode", icon: Coffee },
    { labelKey: "marketing:docs.items.klyntAI", icon: Star },
    { labelKey: "marketing:docs.items.mcp", icon: Puzzle },
    { labelKey: "marketing:docs.items.aiWizard", icon: Wand2 },
    { labelKey: "marketing:docs.items.aiEngineering", icon: Brain },
  ],
};

export const developerAppsCategories: DocCategory = {
  nameKey: "marketing:docs.categories.developerApps",
  items: [
    { labelKey: "marketing:docs.items.productAnalytics", icon: BarChart3 },
    { labelKey: "marketing:docs.items.webAnalytics", icon: LineChart },
    { labelKey: "marketing:docs.items.sessionReplay", icon: Video },
    { labelKey: "marketing:docs.items.replayVision", icon: Eye },
    { labelKey: "marketing:docs.items.featureFlags", icon: Flag },
    { labelKey: "marketing:docs.items.experiments", icon: FlaskConical },
    { labelKey: "marketing:docs.items.errorTracking", icon: AlertTriangle },
    { labelKey: "marketing:docs.items.surveys", icon: ClipboardList },
    { labelKey: "marketing:docs.items.support", icon: MessageSquareText },
    { labelKey: "marketing:docs.items.dataPipelines", icon: Database },
    { labelKey: "marketing:docs.items.dataWarehouse", icon: Database },
    { labelKey: "marketing:docs.items.aiObservability", icon: Bot },
    { labelKey: "marketing:docs.items.mcpAnalytics", icon: Radio },
    { labelKey: "marketing:docs.items.revenueAnalytics", icon: DollarSign },
    { labelKey: "marketing:docs.items.customerAnalytics", icon: Users },
    { labelKey: "marketing:docs.items.slackApp", icon: MessageSquare },
    { labelKey: "marketing:docs.items.workflows", icon: Zap },
    { labelKey: "marketing:docs.items.logs", icon: FileText },
    { labelKey: "marketing:docs.items.distributedTracing", icon: SearchIcon },
    { labelKey: "marketing:docs.items.endpoints", icon: Plug },
  ],
};

export const allDocCategories: DocCategory[] = [
  integrationCategories,
  aiPlatformCategories,
  developerAppsCategories,
];

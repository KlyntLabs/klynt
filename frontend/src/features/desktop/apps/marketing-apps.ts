import {
  BarChart3,
  Beaker,
  BookMarked,
  Bookmark,
  BookOpen,
  Building2,
  Calendar,
  Database,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  Mail,
  MessageCircleQuestion,
  PlayCircle,
  ShoppingBag,
  Table,
  Trash2,
  Video,
} from "lucide-react";
import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

export interface AppIconProps {
  className?: string;
}

export interface MarketingAppManifest {
  id: string;
  route: string;
  title: string;
  shortTitle?: string;
  icon: ComponentType<AppIconProps>;
  category: string;
  defaultSize: { width: number; height: number };
  menuGroup?: string;
  dock?: { position: "left" | "right"; order: number };
}

export interface WindowApp {
  manifest: MarketingAppManifest;
  component: LazyExoticComponent<ComponentType> | ComponentType;
}

export interface MarketingRegistry {
  apps: WindowApp[];
  defaultApp: WindowApp;
}

const HomePage = lazy(() => import("@/features/marketing/pages/HomePage"));
const ProductsPage = lazy(() => import("@/features/marketing/pages/ProductsPage"));
const PricingPage = lazy(() => import("@/features/marketing/pages/PricingPage"));
const CustomersPage = lazy(() => import("@/features/marketing/pages/CustomersPage"));
const DocsPage = lazy(() => import("@/features/marketing/pages/DocsPage"));
const AboutPage = lazy(() => import("@/features/marketing/pages/AboutPage"));
const CommunityPage = lazy(() => import("@/features/marketing/pages/CommunityPage"));
const TalkToHumanPage = lazy(() => import("@/features/marketing/pages/TalkToHumanPage"));
const TrashPage = lazy(() => import("@/features/marketing/pages/TrashPage"));

const SIZE_DEFAULT = { width: 680, height: 520 };
const SIZE_WIDE = { width: 900, height: 600 };
const SIZE_PRESENTATION = { width: 1000, height: 700 };
const SIZE_DEMO = { width: 720, height: 480 };
const SIZE_HOME = { width: 640, height: 560 };

function marketingApp(
  partial: Omit<MarketingAppManifest, "category"> & { component: WindowApp["component"] }
): WindowApp {
  return {
    manifest: {
      category: "marketing",
      ...partial,
    },
    component: partial.component,
  };
}

export const marketingApps: WindowApp[] = [
  marketingApp({
    id: "home",
    route: "/",
    title: "home.mdx",
    icon: FileText,
    defaultSize: SIZE_HOME,
    dock: { position: "left", order: 1 },
    component: HomePage,
  }),
  marketingApp({
    id: "demo",
    route: "/demo",
    title: "demo.mov",
    icon: Video,
    defaultSize: SIZE_DEMO,
    dock: { position: "left", order: 5 },
    component: HomePage,
  }),
  // Product OS family
  marketingApp({
    id: "products",
    route: "/products",
    title: "Product OS",
    menuGroup: "productOS",
    icon: FolderOpen,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "left", order: 2 },
    component: ProductsPage,
  }),
  marketingApp({
    id: "product-analytics",
    route: "/product-analytics",
    title: "Product Analytics",
    menuGroup: "productOS",
    icon: BarChart3,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "web-analytics",
    route: "/web-analytics",
    title: "Web Analytics",
    menuGroup: "productOS",
    icon: Globe,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "session-replay",
    route: "/session-replay",
    title: "Session Replay",
    menuGroup: "productOS",
    icon: PlayCircle,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "feature-flags",
    route: "/feature-flags",
    title: "Feature Flags",
    menuGroup: "productOS",
    icon: Flag,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "experiments",
    route: "/experiments",
    title: "Experiments",
    menuGroup: "productOS",
    icon: Beaker,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "surveys",
    route: "/surveys",
    title: "Surveys",
    menuGroup: "productOS",
    icon: MessageCircleQuestion,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "data-warehouse",
    route: "/data-warehouse",
    title: "Data Warehouse",
    menuGroup: "productOS",
    icon: Database,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  // Pricing
  marketingApp({
    id: "pricing",
    route: "/pricing",
    title: "Pricing",
    menuGroup: "pricing",
    icon: Table,
    defaultSize: SIZE_WIDE,
    dock: { position: "left", order: 3 },
    component: PricingPage,
  }),
  // Content
  marketingApp({
    id: "customers",
    route: "/customers",
    title: "customers.mdx",
    icon: FileText,
    defaultSize: { width: 700, height: 520 },
    dock: { position: "left", order: 4 },
    component: CustomersPage,
  }),
  marketingApp({
    id: "docs",
    route: "/docs",
    title: "Docs",
    menuGroup: "docs",
    icon: BookOpen,
    defaultSize: SIZE_WIDE,
    dock: { position: "left", order: 6 },
    component: DocsPage,
  }),
  // Company
  marketingApp({
    id: "about",
    route: "/about",
    title: "Why PostHog?",
    shortTitle: "About",
    menuGroup: "company",
    icon: Bookmark,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 1 },
    component: AboutPage,
  }),
  marketingApp({
    id: "careers",
    route: "/careers",
    title: "Careers",
    menuGroup: "company",
    icon: Building2,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 5 },
    component: AboutPage,
  }),
  marketingApp({
    id: "handbook",
    route: "/handbook",
    title: "Company handbook",
    shortTitle: "Handbook",
    menuGroup: "company",
    icon: BookMarked,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 3 },
    component: AboutPage,
  }),
  marketingApp({
    id: "merch",
    route: "/merch",
    title: "Store",
    menuGroup: "more",
    icon: ShoppingBag,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 4 },
    component: AboutPage,
  }),
  // Community
  marketingApp({
    id: "community",
    route: "/community",
    title: "Community",
    menuGroup: "community",
    icon: MessageCircleQuestion,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "left", order: 8 },
    component: CommunityPage,
  }),
  marketingApp({
    id: "changelog",
    route: "/changelog",
    title: "Changelog",
    menuGroup: "community",
    icon: Calendar,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 2 },
    component: CommunityPage,
  }),
  marketingApp({
    id: "talk-to-a-human",
    route: "/talk-to-a-human",
    title: "Talk to a human",
    shortTitle: "Talk to us",
    menuGroup: "more",
    icon: Mail,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "left", order: 7 },
    component: TalkToHumanPage,
  }),
  // System
  marketingApp({
    id: "trash",
    route: "/trash",
    title: "Trash",
    menuGroup: "more",
    icon: Trash2,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 6 },
    component: TrashPage,
  }),
];

export const marketingRegistry: MarketingRegistry = {
  apps: marketingApps,
  defaultApp: marketingApps[0],
};

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
import { lazy } from "react";
import type { AppManifest } from "../types";

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

function marketingApp(partial: Omit<AppManifest, "category">): AppManifest {
  return {
    category: "marketing",
    ...partial,
  };
}

export const marketingApps: AppManifest[] = [
  marketingApp({
    id: "home",
    route: "/",
    title: "desktop.marketing.apps.home",
    icon: FileText,
    defaultSize: SIZE_HOME,
    dock: { position: "left", order: 1 },
    component: HomePage,
  }),
  marketingApp({
    id: "demo",
    route: "/demo",
    title: "desktop.marketing.apps.demo",
    icon: Video,
    defaultSize: SIZE_DEMO,
    dock: { position: "left", order: 5 },
    component: HomePage,
  }),
  // Product OS family
  marketingApp({
    id: "products",
    route: "/products",
    title: "desktop.marketing.apps.products",
    menuGroup: "productOS",
    icon: FolderOpen,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "left", order: 2 },
    component: ProductsPage,
  }),
  marketingApp({
    id: "product-analytics",
    route: "/product-analytics",
    title: "desktop.marketing.apps.productAnalytics",
    menuGroup: "productOS",
    icon: BarChart3,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "web-analytics",
    route: "/web-analytics",
    title: "desktop.marketing.apps.webAnalytics",
    menuGroup: "productOS",
    icon: Globe,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "session-replay",
    route: "/session-replay",
    title: "desktop.marketing.apps.sessionReplay",
    menuGroup: "productOS",
    icon: PlayCircle,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "feature-flags",
    route: "/feature-flags",
    title: "desktop.marketing.apps.featureFlags",
    menuGroup: "productOS",
    icon: Flag,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "experiments",
    route: "/experiments",
    title: "desktop.marketing.apps.experiments",
    menuGroup: "productOS",
    icon: Beaker,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "surveys",
    route: "/surveys",
    title: "desktop.marketing.apps.surveys",
    menuGroup: "productOS",
    icon: MessageCircleQuestion,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  marketingApp({
    id: "data-warehouse",
    route: "/data-warehouse",
    title: "desktop.marketing.apps.dataWarehouse",
    menuGroup: "productOS",
    icon: Database,
    defaultSize: SIZE_PRESENTATION,
    component: ProductsPage,
  }),
  // Pricing
  marketingApp({
    id: "pricing",
    route: "/pricing",
    title: "desktop.marketing.apps.pricing",
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
    title: "desktop.marketing.apps.customers",
    icon: FileText,
    defaultSize: { width: 700, height: 520 },
    dock: { position: "left", order: 4 },
    component: CustomersPage,
  }),
  marketingApp({
    id: "docs",
    route: "/docs",
    title: "desktop.marketing.apps.docs",
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
    title: "desktop.marketing.apps.about",
    shortTitle: "desktop.menubar.menus.company.about",
    menuGroup: "company",
    icon: Bookmark,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 1 },
    component: AboutPage,
  }),
  marketingApp({
    id: "careers",
    route: "/careers",
    title: "desktop.marketing.apps.careers",
    menuGroup: "company",
    icon: Building2,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 5 },
    component: AboutPage,
  }),
  marketingApp({
    id: "handbook",
    route: "/handbook",
    title: "desktop.marketing.apps.handbook",
    shortTitle: "desktop.menubar.menus.company.handbook",
    menuGroup: "company",
    icon: BookMarked,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 3 },
    component: AboutPage,
  }),
  marketingApp({
    id: "merch",
    route: "/merch",
    title: "desktop.marketing.apps.merch",
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
    title: "desktop.marketing.apps.community",
    menuGroup: "community",
    icon: MessageCircleQuestion,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "left", order: 8 },
    component: CommunityPage,
  }),
  marketingApp({
    id: "changelog",
    route: "/changelog",
    title: "desktop.marketing.apps.changelog",
    menuGroup: "community",
    icon: Calendar,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 2 },
    component: CommunityPage,
  }),
  marketingApp({
    id: "talk-to-a-human",
    route: "/talk-to-a-human",
    title: "desktop.marketing.apps.talkToHuman",
    shortTitle: "desktop.menubar.menus.more.talkToHuman",
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
    title: "desktop.marketing.apps.trash",
    menuGroup: "more",
    icon: Trash2,
    defaultSize: SIZE_DEFAULT,
    dock: { position: "right", order: 6 },
    component: TrashPage,
  }),
];

export const marketingRegistry = {
  apps: marketingApps,
  defaultApp: marketingApps[0],
};

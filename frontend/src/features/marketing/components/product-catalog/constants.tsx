import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bot,
  ClipboardList,
  Clock,
  FileText,
  Filter,
  Flag,
  Flame,
  GitBranch,
  Globe,
  LifeBuoy,
  PlayCircle,
  Plug,
  Rocket,
  RotateCcw,
  TestTube,
  TrendingUp,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/**
 * The categorical hues Astryx ships a full token family for: every hue below has a matching
 * `--color-background-*`, `--color-border-*`, `--color-icon-*` and `--color-text-*`. `ProductIcon`
 * turns the hue into a tinted tile via `product-icon.module.css` — the old per-category
 * hand-picked tint/ink hex pairs are gone; a hue name is now the only thing a product declares.
 */
export type ProductIconHue =
  | "blue"
  | "gray"
  | "green"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "yellow";

export interface ProductIconConfig {
  icon: React.ReactNode;
  hue: ProductIconHue;
}

/** Icon geometry in px, replacing the `w-4 h-4` utility class. */
export const PRODUCT_ICON_SIZE = 16;

export const productIconMap: Record<string, ProductIconConfig> = {
  Globe: { icon: <Globe size={PRODUCT_ICON_SIZE} />, hue: "green" },
  BarChart3: { icon: <BarChart3 size={PRODUCT_ICON_SIZE} />, hue: "orange" },
  PlayCircle: { icon: <PlayCircle size={PRODUCT_ICON_SIZE} />, hue: "purple" },
  Filter: { icon: <Filter size={PRODUCT_ICON_SIZE} />, hue: "blue" },
  Flame: { icon: <Flame size={PRODUCT_ICON_SIZE} />, hue: "red" },
  TrendingUp: { icon: <TrendingUp size={PRODUCT_ICON_SIZE} />, hue: "green" },
  RotateCcw: { icon: <RotateCcw size={PRODUCT_ICON_SIZE} />, hue: "yellow" },
  GitBranch: { icon: <GitBranch size={PRODUCT_ICON_SIZE} />, hue: "blue" },
  Bot: { icon: <Bot size={PRODUCT_ICON_SIZE} />, hue: "purple" },
  AlertTriangle: { icon: <AlertTriangle size={PRODUCT_ICON_SIZE} />, hue: "red" },
  FileText: { icon: <FileText size={PRODUCT_ICON_SIZE} />, hue: "gray" },
  Clock: { icon: <Clock size={PRODUCT_ICON_SIZE} />, hue: "blue" },
  Flag: { icon: <Flag size={PRODUCT_ICON_SIZE} />, hue: "green" },
  Beaker: { icon: <Beaker size={PRODUCT_ICON_SIZE} />, hue: "blue" },
  TestTube: { icon: <TestTube size={PRODUCT_ICON_SIZE} />, hue: "purple" },
  Rocket: { icon: <Rocket size={PRODUCT_ICON_SIZE} />, hue: "orange" },
  Plug: { icon: <Plug size={PRODUCT_ICON_SIZE} />, hue: "gray" },
  Webhook: { icon: <Webhook size={PRODUCT_ICON_SIZE} />, hue: "yellow" },
  Workflow: { icon: <Workflow size={PRODUCT_ICON_SIZE} />, hue: "blue" },
  ClipboardList: { icon: <ClipboardList size={PRODUCT_ICON_SIZE} />, hue: "pink" },
  LifeBuoy: { icon: <LifeBuoy size={PRODUCT_ICON_SIZE} />, hue: "green" },
  Users: { icon: <Users size={PRODUCT_ICON_SIZE} />, hue: "purple" },
};

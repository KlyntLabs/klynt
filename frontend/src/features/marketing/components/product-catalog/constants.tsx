import type { IconType } from "@astryxdesign/core/Icon";
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
import { tween } from "@/core/motion/astryx-motion";

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween("medium-min"),
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

/**
 * The mark is stored as a *component*, not an element: Astryx's Icon takes `icon` as a
 * `ComponentType`, and its docs are explicit — "Don't render raw SVG elements; always wrap in
 * Icon". `ProductIcon` does the wrapping, so a product declares only a glyph and a hue.
 */
export interface ProductIconConfig {
  icon: IconType;
  hue: ProductIconHue;
}

export const productIconMap: Record<string, ProductIconConfig> = {
  Globe: { icon: Globe, hue: "green" },
  BarChart3: { icon: BarChart3, hue: "orange" },
  PlayCircle: { icon: PlayCircle, hue: "purple" },
  Filter: { icon: Filter, hue: "blue" },
  Flame: { icon: Flame, hue: "red" },
  TrendingUp: { icon: TrendingUp, hue: "green" },
  RotateCcw: { icon: RotateCcw, hue: "yellow" },
  GitBranch: { icon: GitBranch, hue: "blue" },
  Bot: { icon: Bot, hue: "purple" },
  AlertTriangle: { icon: AlertTriangle, hue: "red" },
  FileText: { icon: FileText, hue: "gray" },
  Clock: { icon: Clock, hue: "blue" },
  Flag: { icon: Flag, hue: "green" },
  Beaker: { icon: Beaker, hue: "blue" },
  TestTube: { icon: TestTube, hue: "purple" },
  Rocket: { icon: Rocket, hue: "orange" },
  Plug: { icon: Plug, hue: "gray" },
  Webhook: { icon: Webhook, hue: "yellow" },
  Workflow: { icon: Workflow, hue: "blue" },
  ClipboardList: { icon: ClipboardList, hue: "pink" },
  LifeBuoy: { icon: LifeBuoy, hue: "green" },
  Users: { icon: Users, hue: "purple" },
};

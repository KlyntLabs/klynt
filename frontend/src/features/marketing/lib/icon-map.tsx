import { Icon } from "@astryxdesign/core/Icon";
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

/*
 * The marketing icon lookup table.
 *
 * Every mark is an Astryx `Icon`. Both the geometry and the hue are Icon props:
 *
 * - Size: Icon's scale is xsm(12) / sm(16) / md(20) / lg(24). Its docs are explicit —
 *   "Don't resize icons with arbitrary pixel values; use the provided size props" — so the
 *   pre-migration 28px/32px marks snap up to the top of that scale (`lg`), and the 20px marks
 *   land on `md` exactly. There is no numeric size on Icon by design.
 *
 * - Colour: Icon's `IconColor` union carries the full categorical hue set (blue, orange, red,
 *   green, gray, purple, …) alongside the semantic one, and each hue resolves to the very same
 *   `--color-icon-<hue>` token the old CSS module set by hand. The hue class file is therefore
 *   gone: the colour is now a prop, which is the native path.
 */

/** The display marks (product tiles). `lg` is the largest size Astryx's Icon offers. */
const DISPLAY = "lg" as const;

/** The inline marks that sit beside a line of text. */
const INLINE = "md" as const;

export const marketingIconMap: Record<string, React.ReactNode> = {
  Globe: <Icon icon={Globe} size={DISPLAY} color="blue" />,
  BarChart3: <Icon icon={BarChart3} size={DISPLAY} color="orange" />,
  PlayCircle: <Icon icon={PlayCircle} size={DISPLAY} color="red" />,
  Filter: <Icon icon={Filter} size={DISPLAY} color="green" />,
  Flame: <Icon icon={Flame} size={DISPLAY} color="orange" />,
  TrendingUp: <Icon icon={TrendingUp} size={DISPLAY} color="green" />,
  RotateCcw: <Icon icon={RotateCcw} size={DISPLAY} color="gray" />,
  GitBranch: <Icon icon={GitBranch} size={DISPLAY} color="purple" />,
  Bot: <Icon icon={Bot} size={DISPLAY} color="blue" />,
  AlertTriangle: <Icon icon={AlertTriangle} size={DISPLAY} color="orange" />,
  FileText: <Icon icon={FileText} size={DISPLAY} color="gray" />,
  Clock: <Icon icon={Clock} size={DISPLAY} color="blue" />,
  Flag: <Icon icon={Flag} size={INLINE} color="blue" />,
  Beaker: <Icon icon={Beaker} size={INLINE} color="purple" />,
  TestTube: <Icon icon={TestTube} size={INLINE} color="green" />,
  Rocket: <Icon icon={Rocket} size={INLINE} color="orange" />,
  Plug: <Icon icon={Plug} size={INLINE} color="gray" />,
  Webhook: <Icon icon={Webhook} size={INLINE} color="gray" />,
  Workflow: <Icon icon={Workflow} size={INLINE} color="gray" />,
  ClipboardList: <Icon icon={ClipboardList} size={INLINE} color="orange" />,
  LifeBuoy: <Icon icon={LifeBuoy} size={INLINE} color="blue" />,
  Users: <Icon icon={Users} size={INLINE} color="green" />,
  BarChart3Small: <Icon icon={BarChart3} size={INLINE} color="orange" />,
  PlayCircleSmall: <Icon icon={PlayCircle} size={INLINE} color="red" />,
};

export function getMarketingIcon(name: string, fallback?: React.ReactNode): React.ReactNode {
  return marketingIconMap[name] ?? fallback;
}

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
import styles from "./icon-map.module.css";

/**
 * Icon geometry, in px, matching Astryx's 4px spacing rhythm (was `w-7 h-7`, `w-8 h-8`,
 * `w-5 h-5`). lucide sizes itself from a numeric prop, so no utility class is needed.
 */
const LARGE_ICON_SIZE = 28;
const XL_ICON_SIZE = 32;
const SMALL_ICON_SIZE = 20;

/** Categorical hues, mapped onto Astryx's `--color-icon-*` tokens in `icon-map.module.css`. */
const color = {
  blue: styles.blue,
  orange: styles.orange,
  red: styles.red,
  green: styles.green,
  gray: styles.gray,
  purple: styles.purple,
};

export const marketingIconMap: Record<string, React.ReactNode> = {
  Globe: <Globe size={LARGE_ICON_SIZE} className={color.blue} />,
  BarChart3: <BarChart3 size={LARGE_ICON_SIZE} className={color.orange} />,
  PlayCircle: <PlayCircle size={LARGE_ICON_SIZE} className={color.red} />,
  Filter: <Filter size={LARGE_ICON_SIZE} className={color.green} />,
  Flame: <Flame size={LARGE_ICON_SIZE} className={color.orange} />,
  TrendingUp: <TrendingUp size={LARGE_ICON_SIZE} className={color.green} />,
  RotateCcw: <RotateCcw size={LARGE_ICON_SIZE} className={color.gray} />,
  GitBranch: <GitBranch size={LARGE_ICON_SIZE} className={color.purple} />,
  Bot: <Bot size={LARGE_ICON_SIZE} className={color.blue} />,
  AlertTriangle: <AlertTriangle size={XL_ICON_SIZE} className={color.orange} />,
  FileText: <FileText size={XL_ICON_SIZE} className={color.gray} />,
  Clock: <Clock size={XL_ICON_SIZE} className={color.blue} />,
  Flag: <Flag size={SMALL_ICON_SIZE} className={color.blue} />,
  Beaker: <Beaker size={SMALL_ICON_SIZE} className={color.purple} />,
  TestTube: <TestTube size={SMALL_ICON_SIZE} className={color.green} />,
  Rocket: <Rocket size={SMALL_ICON_SIZE} className={color.orange} />,
  Plug: <Plug size={SMALL_ICON_SIZE} className={color.gray} />,
  Webhook: <Webhook size={SMALL_ICON_SIZE} className={color.gray} />,
  Workflow: <Workflow size={SMALL_ICON_SIZE} className={color.gray} />,
  ClipboardList: <ClipboardList size={SMALL_ICON_SIZE} className={color.orange} />,
  LifeBuoy: <LifeBuoy size={SMALL_ICON_SIZE} className={color.blue} />,
  Users: <Users size={SMALL_ICON_SIZE} className={color.green} />,
  BarChart3Small: <BarChart3 size={SMALL_ICON_SIZE} className={color.orange} />,
  PlayCircleSmall: <PlayCircle size={SMALL_ICON_SIZE} className={color.red} />,
};

export function getMarketingIcon(name: string, fallback?: React.ReactNode): React.ReactNode {
  return marketingIconMap[name] ?? fallback;
}

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

const LARGE_ICON_SIZE = "w-7 h-7";
const XL_ICON_SIZE = "w-8 h-8";
const SMALL_ICON_SIZE = "w-5 h-5";

const color = {
  blue: "text-[#2563EB]",
  orange: "text-[#F76E18]",
  red: "text-[#DC2626]",
  green: "text-[#22C55E]",
  gray: "text-[#6B6B6B]",
  purple: "text-[#8B5CF6]",
};

export const marketingIconMap: Record<string, React.ReactNode> = {
  Globe: <Globe className={`${LARGE_ICON_SIZE} ${color.blue}`} />,
  BarChart3: <BarChart3 className={`${LARGE_ICON_SIZE} ${color.orange}`} />,
  PlayCircle: <PlayCircle className={`${LARGE_ICON_SIZE} ${color.red}`} />,
  Filter: <Filter className={`${LARGE_ICON_SIZE} ${color.green}`} />,
  Flame: <Flame className={`${LARGE_ICON_SIZE} ${color.orange}`} />,
  TrendingUp: <TrendingUp className={`${LARGE_ICON_SIZE} ${color.green}`} />,
  RotateCcw: <RotateCcw className={`${LARGE_ICON_SIZE} ${color.gray}`} />,
  GitBranch: <GitBranch className={`${LARGE_ICON_SIZE} ${color.purple}`} />,
  Bot: <Bot className={`${LARGE_ICON_SIZE} ${color.blue}`} />,
  AlertTriangle: <AlertTriangle className={`${XL_ICON_SIZE} ${color.orange}`} />,
  FileText: <FileText className={`${XL_ICON_SIZE} ${color.gray}`} />,
  Clock: <Clock className={`${XL_ICON_SIZE} ${color.blue}`} />,
  Flag: <Flag className={`${SMALL_ICON_SIZE} ${color.blue}`} />,
  Beaker: <Beaker className={`${SMALL_ICON_SIZE} ${color.purple}`} />,
  TestTube: <TestTube className={`${SMALL_ICON_SIZE} ${color.green}`} />,
  Rocket: <Rocket className={`${SMALL_ICON_SIZE} ${color.orange}`} />,
  Plug: <Plug className={`${SMALL_ICON_SIZE} ${color.gray}`} />,
  Webhook: <Webhook className={`${SMALL_ICON_SIZE} ${color.gray}`} />,
  Workflow: <Workflow className={`${SMALL_ICON_SIZE} ${color.gray}`} />,
  ClipboardList: <ClipboardList className={`${SMALL_ICON_SIZE} ${color.orange}`} />,
  LifeBuoy: <LifeBuoy className={`${SMALL_ICON_SIZE} ${color.blue}`} />,
  Users: <Users className={`${SMALL_ICON_SIZE} ${color.green}`} />,
  BarChart3Small: <BarChart3 className={`${SMALL_ICON_SIZE} ${color.orange}`} />,
  PlayCircleSmall: <PlayCircle className={`${SMALL_ICON_SIZE} ${color.red}`} />,
};

export function getMarketingIcon(name: string, fallback?: React.ReactNode): React.ReactNode {
  return marketingIconMap[name] ?? fallback;
}

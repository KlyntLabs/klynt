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

export const productIconMap: Record<string, { icon: React.ReactNode; bg: string; color: string }> =
  {
    Globe: { icon: <Globe className="w-4 h-4" />, bg: "bg-[#DCFCE7]", color: "text-[#166534]" },
    BarChart3: {
      icon: <BarChart3 className="w-4 h-4" />,
      bg: "bg-[#FFF7ED]",
      color: "text-[#9A3412]",
    },
    PlayCircle: {
      icon: <PlayCircle className="w-4 h-4" />,
      bg: "bg-[#F3E8FF]",
      color: "text-[#6B21A8]",
    },
    Filter: { icon: <Filter className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
    Flame: { icon: <Flame className="w-4 h-4" />, bg: "bg-[#FEE2E2]", color: "text-[#991B1B]" },
    TrendingUp: {
      icon: <TrendingUp className="w-4 h-4" />,
      bg: "bg-[#DCFCE7]",
      color: "text-[#166534]",
    },
    RotateCcw: {
      icon: <RotateCcw className="w-4 h-4" />,
      bg: "bg-[#FEF9C3]",
      color: "text-[#854D0E]",
    },
    GitBranch: {
      icon: <GitBranch className="w-4 h-4" />,
      bg: "bg-[#DBEAFE]",
      color: "text-[#1E40AF]",
    },
    Bot: { icon: <Bot className="w-4 h-4" />, bg: "bg-[#F3E8FF]", color: "text-[#6B21A8]" },
    AlertTriangle: {
      icon: <AlertTriangle className="w-4 h-4" />,
      bg: "bg-[#FEE2E2]",
      color: "text-[#991B1B]",
    },
    FileText: {
      icon: <FileText className="w-4 h-4" />,
      bg: "bg-[#F3F4F6]",
      color: "text-[#374151]",
    },
    Clock: { icon: <Clock className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
    Flag: { icon: <Flag className="w-4 h-4" />, bg: "bg-[#DCFCE7]", color: "text-[#166534]" },
    Beaker: { icon: <Beaker className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
    TestTube: {
      icon: <TestTube className="w-4 h-4" />,
      bg: "bg-[#F3E8FF]",
      color: "text-[#6B21A8]",
    },
    Rocket: { icon: <Rocket className="w-4 h-4" />, bg: "bg-[#FFF7ED]", color: "text-[#9A3412]" },
    Plug: { icon: <Plug className="w-4 h-4" />, bg: "bg-[#F3F4F6]", color: "text-[#374151]" },
    Webhook: {
      icon: <Webhook className="w-4 h-4" />,
      bg: "bg-[#FEF9C3]",
      color: "text-[#854D0E]",
    },
    Workflow: {
      icon: <Workflow className="w-4 h-4" />,
      bg: "bg-[#DBEAFE]",
      color: "text-[#1E40AF]",
    },
    ClipboardList: {
      icon: <ClipboardList className="w-4 h-4" />,
      bg: "bg-[#FCE7F3]",
      color: "text-[#9D174D]",
    },
    LifeBuoy: {
      icon: <LifeBuoy className="w-4 h-4" />,
      bg: "bg-[#DCFCE7]",
      color: "text-[#166534]",
    },
    Users: { icon: <Users className="w-4 h-4" />, bg: "bg-[#F3E8FF]", color: "text-[#6B21A8]" },
  };

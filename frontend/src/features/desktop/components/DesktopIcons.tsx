import {
  BookMarked,
  Bookmark,
  BookOpen,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  FolderOpen,
  Mail,
  MessageCircleQuestion,
  Monitor,
  ShoppingBag,
  Table,
  Trash2,
  Video,
} from "lucide-react";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

interface DesktopIconItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function DesktopIconItem({ icon, label, onClick }: DesktopIconItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 w-[72px] group cursor-pointer"
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm group-hover:bg-white group-hover:scale-105 group-hover:shadow-md transition-all duration-150">
        {icon}
      </div>
      <span className="text-[11px] font-medium text-center text-[#1A1A1A] leading-tight max-w-[72px] line-clamp-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
        {label}
      </span>
    </button>
  );
}

const leftIcons = [
  {
    label: "home.mdx",
    icon: <FileText className="w-6 h-6 text-[#2563EB]" />,
    route: "/",
    title: "home.mdx",
  },
  {
    label: "Product OS",
    icon: <FolderOpen className="w-6 h-6 text-[#F76E18]" />,
    route: "/products",
    title: "Product OS",
  },
  {
    label: "Pricing",
    icon: <Table className="w-6 h-6 text-[#22C55E]" />,
    route: "/pricing",
    title: "Pricing",
  },
  {
    label: "customers.mdx",
    icon: <FileText className="w-6 h-6 text-[#2563EB]" />,
    route: "/customers",
    title: "customers.mdx",
  },
  {
    label: "demo.mov",
    icon: <Video className="w-6 h-6 text-[#DC2626]" />,
    route: "/demo",
    title: "demo.mov",
  },
  {
    label: "Docs",
    icon: <BookOpen className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/docs",
    title: "Docs",
  },
  {
    label: "Talk to a human",
    icon: <Mail className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/talk-to-a-human",
    title: "Talk to a human",
  },
  {
    label: "Ask a question",
    icon: <MessageCircleQuestion className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/community",
    title: "Community",
  },
  {
    label: "Sign up",
    icon: <ExternalLink className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/signup",
    title: "Sign up",
  },
];

const rightIcons = [
  {
    label: "Why PostHog?",
    icon: <Bookmark className="w-6 h-6 text-[#F76E18]" />,
    route: "/about",
    title: "Why PostHog?",
  },
  {
    label: "Changelog",
    icon: <Calendar className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/changelog",
    title: "Changelog",
  },
  {
    label: "Company handbook",
    icon: <BookMarked className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/handbook",
    title: "Company handbook",
  },
  {
    label: "Store",
    icon: <ShoppingBag className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/merch",
    title: "Store",
  },
  {
    label: "Work here",
    icon: <Building2 className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/careers",
    title: "Careers",
  },
  {
    label: "Trash",
    icon: <Trash2 className="w-6 h-6 text-[#6B6B6B]" />,
    route: "/trash",
    title: "Trash",
  },
];

export default function DesktopIcons() {
  const { openWindow, setViewMode } = useDesktopStore();

  return (
    <>
      {/* Left column */}
      <div className="fixed left-4 top-[52px] z-10 flex flex-col gap-5">
        {leftIcons.map((item) => (
          <DesktopIconItem
            key={item.route}
            icon={item.icon}
            label={item.label}
            onClick={() => openWindow(item.route, item.title)}
          />
        ))}
        <DesktopIconItem
          icon={<Monitor className="w-6 h-6 text-[#6B6B6B]" />}
          label="Switch to website"
          onClick={() => setViewMode("website")}
        />
      </div>

      {/* Right column */}
      <div className="fixed right-4 top-[52px] z-10 flex flex-col gap-5">
        {rightIcons.map((item) => (
          <DesktopIconItem
            key={item.route}
            icon={item.icon}
            label={item.label}
            onClick={() => openWindow(item.route, item.title)}
          />
        ))}
      </div>
    </>
  );
}

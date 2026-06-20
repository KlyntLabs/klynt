import { ExternalLink, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDockApps, marketingRegistry } from "@/features/desktop/apps";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

interface DesktopIconItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function DesktopIconItem({ icon, label, onClick }: DesktopIconItemProps) {
  return (
    <button
      type="button"
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

function DockIcons({ position }: { position: "left" | "right" }) {
  const { openWindow } = useDesktopStore();
  const apps = getDockApps(marketingRegistry, position);

  return (
    <>
      {apps.map((app) => {
        const Icon = app.manifest.icon;
        return (
          <DesktopIconItem
            key={app.manifest.id}
            icon={<Icon className="w-6 h-6" />}
            label={app.manifest.title}
            onClick={() =>
              openWindow(app.manifest.route, app.manifest.title, {
                size: app.manifest.defaultSize,
              })
            }
          />
        );
      })}
    </>
  );
}

export default function DesktopIcons() {
  const { openWindow, setViewMode } = useDesktopStore();
  const { t } = useTranslation("home");

  const handleSignUpClick = () => {
    // Register is not a marketing app yet; open it generically.
    openWindow("/register", t("desktop.icons.left.signUp"));
  };

  return (
    <>
      {/* Left column */}
      <div className="fixed left-4 top-[52px] z-10 flex flex-col gap-5">
        <DockIcons position="left" />
        <DesktopIconItem
          icon={<ExternalLink className="w-6 h-6 text-[#6B6B6B]" />}
          label={t("desktop.icons.left.signUp")}
          onClick={handleSignUpClick}
        />
        <DesktopIconItem
          icon={<Monitor className="w-6 h-6 text-[#6B6B6B]" />}
          label={t("desktop.icons.switchToWebsite")}
          onClick={() => setViewMode("website")}
        />
      </div>

      {/* Right column */}
      <div className="fixed right-4 top-[52px] z-10 flex flex-col gap-5">
        <DockIcons position="right" />
      </div>
    </>
  );
}

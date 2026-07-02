import { ExternalLink, Monitor } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { AppSummary } from "@/features/desktop/api/desktop-apps-api";
import { FolderBreadcrumb } from "@/features/desktop/desktop-manager/FolderBreadcrumb";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import type { AppManifest } from "../apps/types";
import type { DesktopConfig } from "../factory/types";
import { DesktopIconGrid } from "./DesktopIconGrid";

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

function AppIcon({ app, desktopId }: { app: AppManifest; desktopId: string }) {
  const { openApp } = useWindowManager();
  const { t } = useTranslation("home");
  const Icon = app.icon;
  return (
    <DesktopIconItem
      key={app.id}
      icon={<Icon className="w-6 h-6" />}
      label={t(app.title as never)}
      onClick={() =>
        openApp(desktopId, app.id, { width: app.defaultSize.width, height: app.defaultSize.height })
      }
    />
  );
}

function DockIcons({ config, position }: { config: DesktopConfig; position: "left" | "right" }) {
  const apps = config.apps
    .filter((app) => app.dock?.position === position)
    .sort((a, b) => (a.dock?.order ?? 0) - (b.dock?.order ?? 0));

  return (
    <>
      {apps.map((app) => (
        <AppIcon key={app.id} app={app} desktopId={config.id} />
      ))}
    </>
  );
}

interface DesktopIconsProps {
  config: DesktopConfig;
  apps?: AppSummary[];
  onOpenContextMenu?: (event: React.MouseEvent, appId: string, isFolder: boolean) => void;
  selectedAppId?: string | null;
  onSelectAppId?: (appId: string | null) => void;
}

export default function DesktopIcons({
  config,
  apps = [],
  onOpenContextMenu = () => {},
  selectedAppId,
  onSelectAppId,
}: DesktopIconsProps) {
  const { setViewMode } = useWindowManager();
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const isMarketing = config.id === "marketing";
  const tenantSlug = config.context.tenantSlug ?? "";

  const titleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const app of apps) {
      map[app.id] = app.title;
    }
    return map;
  }, [apps]);

  const handleSignUpClick = () => {
    navigate("/register");
  };

  return (
    <>
      {/* Left column */}
      <div className="fixed left-4 top-[52px] z-10 flex flex-col gap-5">
        <DockIcons config={config} position="left" />
        {isMarketing && (
          <>
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
          </>
        )}
      </div>

      {/* Center icon grid */}
      <div
        className="absolute inset-0 flex flex-col items-center pt-20 px-24"
        data-testid="desktop-center-grid"
      >
        <FolderBreadcrumb desktopId={config.id} titleMap={titleMap} />
        <DesktopIconGrid
          desktopId={config.id}
          tenantSlug={tenantSlug}
          apps={apps}
          onOpenContextMenu={onOpenContextMenu}
          selectedAppId={selectedAppId}
          onSelectAppId={onSelectAppId}
        />
      </div>

      {/* Right column */}
      <div className="fixed right-4 top-[52px] z-10 flex flex-col gap-5">
        <DockIcons config={config} position="right" />
      </div>
    </>
  );
}

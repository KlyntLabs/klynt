import { Text } from "@astryxdesign/core/Text";
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
import iconStyles from "./desktop-icon.module.css";
import styles from "./desktop-icons.module.css";

interface DesktopIconItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function DesktopIconItem({ icon, label, onClick }: DesktopIconItemProps) {
  return (
    <button type="button" onClick={onClick} className={iconStyles.icon}>
      <div className={iconStyles.tile}>{icon}</div>
      <Text
        type="supporting"
        size="xsm"
        weight="medium"
        color="primary"
        maxLines={2}
        justify="center"
        className={iconStyles.label}
      >
        {label}
      </Text>
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
      icon={<Icon />}
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
      <div className={`${styles.dock} ${styles.dockLeft}`}>
        <DockIcons config={config} position="left" />
        {isMarketing && (
          <>
            <DesktopIconItem
              icon={<ExternalLink />}
              label={t("desktop.icons.left.signUp")}
              onClick={handleSignUpClick}
            />
            <DesktopIconItem
              icon={<Monitor />}
              label={t("desktop.icons.switchToWebsite")}
              onClick={() => setViewMode("website")}
            />
          </>
        )}
      </div>

      {/* Center icon grid */}
      <div className={styles.centerGrid} data-testid="desktop-center-grid">
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
      <div className={`${styles.dock} ${styles.dockRight}`}>
        <DockIcons config={config} position="right" />
      </div>
    </>
  );
}

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ExternalLink, Monitor } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { AppSummary } from "@/features/desktop/api/desktop-apps-api";
import { FolderBreadcrumb } from "@/features/desktop/desktop-manager/FolderBreadcrumb";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import type { AppManifest } from "../apps/types";
import type { DesktopConfig } from "../factory/types";
import {
  DESKTOP_ICON_PADDING,
  DESKTOP_ICON_WIDTH,
  DesktopIconGrid,
  ICON_FIELD_PADDING,
} from "./DesktopIconGrid";
import styles from "./desktop-icons.module.css";

interface DesktopIconItemProps {
  /*
   * The icon COMPONENT, not an element. Astryx's Icon takes `icon` as a ComponentType and owns
   * the sizing and the colour from there ("Don't render raw SVG elements; always wrap in Icon"),
   * so the caller can no longer hand over a pre-rendered <Icon /> element.
   */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
}

/*
 * A dock icon IS an Astryx ClickableCard.
 *
 * The old tile was a hand-built chip: a translucent surface over a backdrop-filter blur, a
 * hand-rolled border, a hover shadow/scale, a scrim behind the caption, and an `as="button"`
 * stack that needed a `type="button"` spread-cast because BaseProps is not
 * ButtonHTMLAttributes. Every one of those is a value Astryx has no token for — the blur most
 * of all: there is no blur token anywhere in the system.
 *
 * ClickableCard replaces the lot. It renders an opaque Card (border, radius, background,
 * elevation — all tokens) with a real sr-only <button> inside for the role, the accessible name
 * and the focus ring, so there is nothing left to cast and nothing left to hand-value. The
 * caption now sits on the card's own themed background instead of on the wallpaper, which is
 * what the scrim was faking; the dark-mode contrast bug the scrim existed to fix cannot recur.
 */
function DesktopIconItem({ icon, label, onClick }: DesktopIconItemProps) {
  return (
    <ClickableCard
      label={label}
      onClick={onClick}
      width={DESKTOP_ICON_WIDTH}
      padding={DESKTOP_ICON_PADDING}
    >
      <VStack gap={1} align="center" width="100%">
        <Icon icon={icon} size="lg" color="secondary" />
        {/*
         * The caption needs its own full-width stack. `align="center"` above shrinks every child
         * to its content width, and Text has no width prop — so a long single word ("Documentation")
         * sized past the 72px card, overflowed it, and got clipped on both sides. maxLines alone
         * cannot save it: it clamps *lines*, and one unbroken word is one line. This stack bounds
         * the measure; `wordBreak="break-all"` lets the word wrap inside it.
         */}
        <VStack width="100%">
          <Text
            type="supporting"
            size="xsm"
            weight="medium"
            color="primary"
            maxLines={2}
            justify="center"
            wordBreak="break-word"
          >
            {label}
          </Text>
        </VStack>
      </VStack>
    </ClickableCard>
  );
}

function AppIcon({ app, desktopId }: { app: AppManifest; desktopId: string }) {
  const { openApp } = useWindowManager();
  const { t } = useTranslation("home");
  return (
    <DesktopIconItem
      key={app.id}
      icon={app.icon}
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
      <VStack className={`${styles.dock} ${styles.dockLeft}`} gap={5}>
        <DockIcons config={config} position="left" />
        {isMarketing && (
          <>
            <DesktopIconItem
              icon={ExternalLink}
              label={t("desktop.icons.left.signUp")}
              onClick={handleSignUpClick}
            />
            <DesktopIconItem
              icon={Monitor}
              label={t("desktop.icons.switchToWebsite")}
              onClick={() => setViewMode("website")}
            />
          </>
        )}
      </VStack>

      {/* Center icon grid. The gutter is a real `padding` prop now: it used to be
          calc(--spacing-10 * 2) / calc(--spacing-12 * 2) — 80px and 96px, composites that are
          raw pixels wearing a token's coat — and it is now ICON_FIELD_PADDING, a single step ON
          Astryx's scale. The clearance those oversized gutters bought (keeping the field off the
          two docks) is bought instead by capping the field's measure; see DesktopIconGrid. */}
      <VStack
        className={styles.centerGrid}
        align="center"
        padding={ICON_FIELD_PADDING}
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
      </VStack>

      {/* Right column */}
      <VStack className={`${styles.dock} ${styles.dockRight}`} gap={5}>
        <DockIcons config={config} position="right" />
      </VStack>
    </>
  );
}

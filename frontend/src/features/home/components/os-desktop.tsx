import { useTranslation } from "react-i18next";
import { desktopApps } from "../lib/desktop-apps";
import { OsIcon } from "./os-icon";
import { OsTopBar } from "./os-top-bar";

interface OsDesktopProps {
  windowTitle: string;
  children: React.ReactNode;
}

export function OsDesktop({ windowTitle, children }: OsDesktopProps) {
  const { t } = useTranslation("home");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary">
      <OsTopBar windowTitle={windowTitle} />
      <div className="relative flex flex-1">
        <nav
          aria-label={t("desktop.navLabel")}
          className="absolute left-2 top-2 flex flex-row gap-1 md:left-4 md:top-4 md:flex-col"
        >
          {desktopApps.map((app) => (
            <OsIcon key={app.id} to={app.route} icon={app.icon} label={t(app.labelKey)} />
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-center p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}

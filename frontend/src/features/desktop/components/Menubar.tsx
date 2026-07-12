import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassPanel } from "@/components/glass-panel";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { cn } from "@/lib/utils";
import type { DesktopAction } from "../apps/types";
import type { DesktopConfig } from "../factory/types";
import type { MenubarItem, MenubarSchema } from "../menubar/types";
import { BrandLogo } from "./menubar/brand-logo";
import { MenuDropdown } from "./menubar/menu-dropdown";
import { useMenuGroups } from "./menubar/menu-helpers";
import { TrailingActions } from "./menubar/trailing-actions";
import { UserMenu } from "./menubar/user-menu";

interface MenubarProps {
  config: DesktopConfig;
}

export default function Menubar({ config }: MenubarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("home");
  const { openApp } = useWindowManager();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (action: DesktopAction) => {
    switch (action.type) {
      case "open-app":
        openApp(config.id, action.appId);
        break;
      case "navigate":
        navigate(action.to);
        break;
      case "dispatch":
        action.action(config.context);
        break;
      default:
        break;
    }
  };

  const menus = useMenuGroups(config.menubar, handleAction);

  const handleMenuClick = (item: { onClick?: () => void }) => {
    setOpenMenu(null);
    item.onClick?.();
  };

  const handleLogoClick = () => {
    if (config.defaultApp) {
      openApp(config.id, config.defaultApp.id);
    }
  };

  const handleTrailingClick = (item: MenubarItem) => {
    if (item.type === "action") {
      handleAction(item.action);
    }
  };

  // Filter out the static "profile" trailing item — UserMenu handles it live
  const filteredSchema: MenubarSchema = {
    ...config.menubar,
    trailing: config.menubar.trailing.filter((item) => {
      if (item.type !== "action") return true;
      return item.label !== "desktop.menubar.profile";
    }),
  };

  return (
    <GlassPanel
      ref={menuRef}
      variant="topbar"
      radius="none"
      className="fixed top-0 left-0 right-0 z-50 flex h-10 items-center gap-1 px-3"
      style={{
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        backdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Logo */}
      <button type="button" onClick={handleLogoClick} className="flex shrink-0 items-center">
        <BrandLogo
          label={t("desktop.menubar.logo") || config.menubar.brand.label}
          alt={t("desktop.menubar.logoAlt")}
        />
      </button>

      {/* Menu Items */}
      <div className="flex items-center gap-0.5">
        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              onMouseEnter={() => {
                if (openMenu !== null) setOpenMenu(menu.label);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
                openMenu === menu.label
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/80 hover:bg-foreground/5"
              )}
            >
              {t(menu.label as never)}
            </button>

            <MenuDropdown
              group={menu}
              isOpen={openMenu === menu.label}
              onClose={() => setOpenMenu(null)}
              onItemClick={handleMenuClick}
            />
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Right side: schema actions + live auth status */}
      <div className="flex items-center gap-2">
        <TrailingActions schema={filteredSchema} onAction={handleTrailingClick} />
        <UserMenu />
      </div>
    </GlassPanel>
  );
}

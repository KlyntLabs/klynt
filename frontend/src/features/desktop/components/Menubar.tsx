import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import type { DesktopAction } from "../apps/types";
import type { DesktopConfig } from "../factory/types";
import type { MenubarItem, MenubarSchema } from "../menubar/types";

interface MenuItem {
  label: string;
  onClick?: () => void;
  separator?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function itemToMenuItem(
  item: MenubarItem,
  onAction: (action: DesktopAction) => void
): MenuItem | null {
  switch (item.type) {
    case "action":
      return { label: item.label, onClick: () => onAction(item.action) };
    case "separator":
      return { label: "", separator: true };
    case "submenu":
      return {
        label: item.label,
        onClick: () => {},
      };
    default:
      return null;
  }
}

function useMenuGroups(
  menubar: MenubarSchema,
  onAction: (action: DesktopAction) => void
): MenuGroup[] {
  return useMemo(() => {
    return menubar.menus
      .filter(
        (menu): menu is { type: "submenu"; label: string; items: MenubarItem[] } =>
          menu.type === "submenu"
      )
      .map((menu) => ({
        label: menu.label,
        items: menu.items
          .map((item) => itemToMenuItem(item, onAction))
          .filter((item): item is MenuItem => item !== null),
      }));
  }, [menubar.menus, onAction]);
}

interface MenubarProps {
  config: DesktopConfig;
}

export default function Menubar({ config }: MenubarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("home");
  const { openApp } = useDesktopStore();
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

  const handleMenuClick = (item: MenuItem) => {
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

  return (
    <div
      ref={menuRef}
      className="fixed top-0 left-0 right-0 h-9 z-50 flex items-center px-3 gap-1"
      style={{
        background: "rgba(232, 228, 220, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(209, 209, 209, 0.6)",
      }}
    >
      {/* Logo */}
      <button
        type="button"
        onClick={handleLogoClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#D4CFC6] transition-colors"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={t("desktop.menubar.logoAlt")}
        >
          <title>{t("desktop.menubar.logoAlt")}</title>
          <rect width="32" height="32" rx="6" fill="#1A1A2E" />
          <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="#F76E18" />
          <circle cx="22" cy="12" r="2" fill="#F76E18" />
        </svg>
        <span className="text-[13px] font-semibold text-[#1A1A1A]">
          {config.menubar.brand.label}
        </span>
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
              className={`flex items-center gap-0.5 px-2.5 py-1 rounded text-[13px] font-medium transition-colors ${
                openMenu === menu.label
                  ? "bg-[#2563EB] text-white"
                  : "text-[#1A1A1A] hover:bg-[#D4CFC6]"
              }`}
            >
              {menu.label}
            </button>

            {/* Dropdown */}
            {openMenu === menu.label && (
              <div
                className="absolute top-full left-0 mt-0.5 py-1.5 bg-white rounded-lg shadow-lg border border-[#D1D1D1] min-w-[200px] z-[55]"
                onMouseLeave={() => setOpenMenu(null)}
                role="menu"
              >
                {menu.items.map((item) => (
                  <div key={item.label}>
                    {item.separator && <div className="my-1 border-t border-[#E5E5E5]" />}
                    <button
                      type="button"
                      onClick={() => handleMenuClick(item)}
                      className="w-full text-left px-3 py-1.5 text-[13px] text-[#1A1A1A] hover:bg-[#F0EDE6] transition-colors"
                    >
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1.5">
        {config.menubar.trailing.map((item) => {
          if (item.type !== "action") return null;
          const Icon = item.icon;
          const isPrimary = item.variant === "primary";
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleTrailingClick(item)}
              aria-label={item.label}
              className={
                isPrimary
                  ? "h-7 px-3 flex items-center gap-1.5 rounded bg-[#F76E18] hover:bg-[#E56310] text-white text-[12px] font-semibold transition-colors"
                  : "w-7 h-7 flex items-center justify-center rounded hover:bg-[#D4CFC6] transition-colors"
              }
            >
              {Icon && <Icon className={isPrimary ? "w-3.5 h-3.5" : "w-4 h-4 text-[#1A1A1A]"} />}
              {isPrimary && item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

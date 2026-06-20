import { Bell, Search, User, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAppMenuGroups, getAppsByMenuGroup, marketingRegistry } from "@/features/desktop/apps";
import { useMarketingNavigation } from "@/features/desktop/hooks/use-marketing-navigation";

interface MenuItem {
  label: string;
  route?: string;
  external?: boolean;
  separator?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const MENU_GROUP_ORDER = ["productOS", "pricing", "docs", "community", "company", "more"];

const MENU_GROUP_LABEL_KEYS: Record<string, string> = {
  productOS: "desktop.menubar.menus.productOS.label",
  pricing: "desktop.menubar.menus.pricing.label",
  docs: "desktop.menubar.menus.docs.label",
  community: "desktop.menubar.menus.community.label",
  company: "desktop.menubar.menus.company.label",
  more: "desktop.menubar.menus.more.label",
};

function useMenuGroups(): MenuGroup[] {
  const { t } = useTranslation("home");

  return useMemo(() => {
    const groups: MenuGroup[] = [];
    const seenGroups = new Set<string>();

    for (const group of MENU_GROUP_ORDER) {
      const apps = getAppsByMenuGroup(marketingRegistry, group);
      if (apps.length === 0) continue;

      seenGroups.add(group);
      groups.push({
        label: t(MENU_GROUP_LABEL_KEYS[group] as never),
        items: apps.map((app) => ({
          label: app.manifest.shortTitle || app.manifest.title,
          route: app.manifest.route,
        })),
      });
    }

    // Append any registry menu groups not explicitly ordered.
    for (const group of getAppMenuGroups(marketingRegistry)) {
      if (seenGroups.has(group)) continue;
      const apps = getAppsByMenuGroup(marketingRegistry, group);
      groups.push({
        label: group,
        items: apps.map((app) => ({
          label: app.manifest.shortTitle || app.manifest.title,
          route: app.manifest.route,
        })),
      });
    }

    return groups;
  }, [t]);
}

export default function Menubar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { goTo, goToHome, goToPricing } = useMarketingNavigation();
  const { t } = useTranslation("home");
  const menus = useMenuGroups();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (item: MenuItem) => {
    setOpenMenu(null);
    if (item.route) {
      goTo(item.route);
    }
  };

  const handleLogoClick = () => {
    goToHome();
  };

  const handleGetStartedClick = () => {
    goToPricing();
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
        {/* PostHog Logo SVG */}
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
          {t("desktop.menubar.logo")}
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
        <button
          type="button"
          onClick={handleGetStartedClick}
          className="h-7 px-3 flex items-center gap-1.5 rounded bg-[#F76E18] hover:bg-[#E56310] text-white text-[12px] font-semibold transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          {t("desktop.menubar.getStarted")}
        </button>

        <button
          type="button"
          aria-label={t("desktop.menubar.search")}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#D4CFC6] transition-colors"
        >
          <Search className="w-4 h-4 text-[#1A1A1A]" />
        </button>

        <button
          type="button"
          aria-label={t("desktop.menubar.notifications")}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#D4CFC6] transition-colors relative"
        >
          <Bell className="w-4 h-4 text-[#1A1A1A]" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            1
          </span>
        </button>

        <button
          type="button"
          aria-label={t("desktop.menubar.profile")}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[#D1D1D1] hover:bg-[#C4C4C4] transition-colors overflow-hidden"
        >
          <User className="w-4 h-4 text-[#6B6B6B]" />
        </button>
      </div>
    </div>
  );
}

import { Bell, Search, User, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

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

export default function Menubar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openWindow, viewMode } = useDesktopStore();
  const navigate = useNavigate();
  const { t } = useTranslation("home");

  const menus: MenuGroup[] = [
    {
      label: t("desktop.menubar.menus.productOS.label"),
      items: [
        { label: t("desktop.menubar.menus.productOS.overview"), route: "/products" },
        {
          label: t("desktop.menubar.menus.productOS.productAnalytics"),
          route: "/product-analytics",
        },
        { label: t("desktop.menubar.menus.productOS.webAnalytics"), route: "/web-analytics" },
        { label: t("desktop.menubar.menus.productOS.sessionReplay"), route: "/session-replay" },
        { label: t("desktop.menubar.menus.productOS.featureFlags"), route: "/feature-flags" },
        { label: t("desktop.menubar.menus.productOS.experiments"), route: "/experiments" },
        { label: t("desktop.menubar.menus.productOS.surveys"), route: "/surveys" },
        { label: t("desktop.menubar.menus.productOS.dataWarehouse"), route: "/data-warehouse" },
      ],
    },
    {
      label: t("desktop.menubar.menus.pricing.label"),
      items: [{ label: t("desktop.menubar.menus.pricing.item"), route: "/pricing" }],
    },
    {
      label: t("desktop.menubar.menus.docs.label"),
      items: [{ label: t("desktop.menubar.menus.docs.item"), route: "/docs" }],
    },
    {
      label: t("desktop.menubar.menus.community.label"),
      items: [{ label: t("desktop.menubar.menus.community.item"), route: "/community" }],
    },
    {
      label: t("desktop.menubar.menus.company.label"),
      items: [
        { label: t("desktop.menubar.menus.company.about"), route: "/about" },
        { label: t("desktop.menubar.menus.company.careers"), route: "/careers" },
        { label: t("desktop.menubar.menus.company.changelog"), route: "/changelog" },
        { label: t("desktop.menubar.menus.company.handbook"), route: "/handbook" },
      ],
    },
    {
      label: t("desktop.menubar.menus.more.label"),
      items: [
        { label: t("desktop.menubar.menus.more.talkToHuman"), route: "/talk-to-a-human" },
        { label: t("desktop.menubar.menus.more.merch"), route: "/merch" },
        { label: t("desktop.menubar.menus.more.trash"), route: "/trash" },
      ],
    },
  ];

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
      if (viewMode === "desktop") {
        openWindow(item.route, item.label);
      } else {
        navigate(item.route);
      }
    }
  };

  const handleLogoClick = () => {
    if (viewMode === "desktop") {
      openWindow("/", "home.mdx");
    } else {
      navigate("/");
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
          onClick={() => {
            if (viewMode === "desktop") {
              openWindow("/pricing", t("desktop.menubar.menus.pricing.label"));
            } else {
              navigate("/pricing");
            }
          }}
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

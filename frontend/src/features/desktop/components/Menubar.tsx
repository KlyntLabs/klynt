import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { HStack } from "@astryxdesign/core/HStack";
import { TopNav } from "@astryxdesign/core/TopNav";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/core/theme/theme-toggle";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import type { DesktopAction } from "../apps/types";
import type { DesktopConfig } from "../factory/types";
import type { MenubarItem, MenubarSchema } from "../menubar/types";
import { BrandLogo } from "./menubar/brand-logo";
import { useMenuGroups } from "./menubar/menu-helpers";
import { toDropdownEntries } from "./menubar/menu-items";
import { TrailingActions } from "./menubar/trailing-actions";
import { UserMenu } from "./menubar/user-menu";
import styles from "./menubar.module.css";

interface MenubarProps {
  config: DesktopConfig;
}

export default function Menubar({ config }: MenubarProps) {
  // Retained only to drive macOS-style hover switching: once one menu is open, hovering a
  // sibling switches to it. Astryx's DropdownMenu owns open/close and outside-dismissal,
  // so the old click-outside listener and menu ref are gone.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { t } = useTranslation("home");
  const { openApp } = useWindowManager();
  const navigate = useNavigate();

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
    <TopNav
      className={styles.topNav}
      heading={
        /*
         * The logo hit target IS an Astryx Button.
         *
         * It used to be an `<HStack as="button">` with a `type="button"` spread-cast and a CSS
         * module for the native-button reset. Button renders a real `<button type="button">` and
         * brings the ghost surface, the padding, the hover and the focus ring — so the cast and
         * the .logoButton reset both go.
         *
         * The wordmark plate rides on `children` rather than the `icon` slot: that slot
         * force-sizes what it wraps, and BrandLogo is a mark *plus* a wordmark, not a glyph.
         *
         * `label` is the ALT text, not the wordmark. Button applies `label` as the button's
         * aria-label, which wins over the name its content would otherwise derive — so passing
         * the wordmark ("Klynt") here would rename the control from "Klynt logo" to "Klynt".
         * The visible wordmark still comes from BrandLogo; this is only the accessible name.
         */
        <Button variant="ghost" label={t("desktop.menubar.logoAlt")} onClick={handleLogoClick}>
          <BrandLogo
            label={t("desktop.menubar.logo") || config.menubar.brand.label}
            alt={t("desktop.menubar.logoAlt")}
          />
        </Button>
      }
      startContent={
        <HStack gap={1}>
          {menus.map((menu) => (
            <DropdownMenu
              key={menu.label}
              hasChevron={false}
              button={{
                label: t(menu.label as never),
                variant: "ghost",
                // The hover handler has to ride on `button`, not on DropdownMenu itself:
                // DropdownMenu destructures its rest props but never spreads them onto any
                // element, so an onMouseEnter passed at the top level is silently dropped.
                onMouseEnter: () => {
                  if (openMenu !== null) setOpenMenu(menu.label);
                },
              }}
              isMenuOpen={openMenu === menu.label}
              // Only the menu that is actually open may clear the selection. Native
              // popover="auto" evicts the previous popover from the top layer when the next
              // one opens, and that eviction fires onOpenChange(false) on the OLD menu — a
              // naive `setOpenMenu(null)` there would cancel the menu just opened by hover.
              onOpenChange={(isOpen) =>
                setOpenMenu((current) => {
                  if (isOpen) return menu.label;
                  return current === menu.label ? null : current;
                })
              }
              items={toDropdownEntries(menu.items, (key) => t(key as never))}
            />
          ))}
        </HStack>
      }
      endContent={
        <HStack gap={2} align="center">
          <TrailingActions schema={filteredSchema} onAction={handleTrailingClick} />
          {/*
           * The theme control lives in the menubar rather than a settings page because it is
           * global: it drives <Theme mode>, which is the single thing allowed to set the colour
           * mode. Every desktop shows the menubar, so the control is always reachable.
           */}
          <ThemeToggle />
          <UserMenu />
        </HStack>
      }
    />
  );
}

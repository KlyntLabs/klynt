import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import {
  Bold,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Italic,
  Search,
  Settings,
  Share2,
  Type,
  Underline,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The window's document toolbar.
 *
 * These controls are chrome: they exist to make a window read as a document window and have
 * no handlers yet, exactly as before the Astryx migration. Astryx's Toolbar adds roving
 * arrow-key navigation across them for free, which the hand-rolled button row did not have.
 */
/**
 * Astryx's vertical Divider has no intrinsic height: inside a Toolbar it computes to
 * height 0px and disappears. The consumer has to supply one.
 */
const DIVIDER_HEIGHT = "h-4";

export function WindowToolbar() {
  const { t } = useTranslation("home");

  return (
    <Toolbar
      label={t("desktop.window.toolbar.label")}
      size="sm"
      startContent={
        <>
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.back")}
            icon={<ChevronLeft />}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.forward")}
            icon={<ChevronRight />}
          />
          <Divider orientation="vertical" className={DIVIDER_HEIGHT} />
          <Button variant="ghost" size="sm" label={t("desktop.window.zoom")} />
          <Divider orientation="vertical" className={DIVIDER_HEIGHT} />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.bold")}
            icon={<Bold />}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.italic")}
            icon={<Italic />}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.underline")}
            icon={<Underline />}
          />
          <Divider orientation="vertical" className={DIVIDER_HEIGHT} />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.font")}
            icon={<Type />}
          />
        </>
      }
      endContent={
        <>
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.search")}
            icon={<Search />}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.bookmark")}
            icon={<Bookmark />}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.window.toolbar.settings")}
            icon={<Settings />}
          />
          {/* Brand orange now comes from the klynt theme's accent, not a hardcoded #F76E18. */}
          <Button variant="primary" size="sm" label={t("desktop.window.share")} icon={<Share2 />} />
        </>
      }
    />
  );
}

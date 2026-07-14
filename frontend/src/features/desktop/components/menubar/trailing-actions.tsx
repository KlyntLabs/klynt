import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Bell, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MenubarItem, MenubarSchema } from "@/features/desktop/menubar/types";

export function TrailingActions({
  schema,
  onAction,
}: {
  schema: MenubarSchema;
  onAction: (item: MenubarItem) => void;
}) {
  const { t } = useTranslation("home");

  return (
    <HStack gap={1} align="center">
      {schema.trailing.map((item) => {
        if (item.type !== "action") return null;
        const ItemIcon = item.icon;
        const isPrimary = item.variant === "primary";
        const label = t(item.label as never);

        if (isPrimary) {
          return (
            <Button
              key={item.label}
              variant="primary"
              size="sm"
              label={label}
              onClick={() => onAction(item)}
            />
          );
        }

        const isNotifications = item.label === "desktop.menubar.notifications";

        /*
         * Resolve the icon COMPONENT, not an element. Building bare `<Icon/>` elements at
         * statement level inside a .map() callback trips biome's useJsxKeyInIterable — it cannot
         * tell that they are icon slots for a keyed sibling rather than iterated children. Every
         * element in this callback now hangs off the keyed IconButton, and the glyph is a plain
         * ComponentType until the moment it is handed to <Icon>, which owns its size and colour.
         */
        const GlyphIcon =
          item.label === "desktop.menubar.search" ? Search : isNotifications ? Bell : ItemIcon;

        const button = (
          <IconButton
            key={item.label}
            variant="ghost"
            size="sm"
            label={label}
            icon={GlyphIcon ? <Icon icon={GlyphIcon} /> : undefined}
            onClick={() => onAction(item)}
          />
        );

        /*
         * The unread marker used to be a hand-positioned dot overlaid on the bell — two spans and
         * an absolutely-positioned pseudo-element. Astryx names the primitive for this outright
         * ("Status → StatusDot/Token"), so the dot now sits *beside* the bell rather than on it.
         * That is a deliberate redesign to fit the design system, not a reproduction of the old
         * chrome: StatusDot carries its own accessible name and its own token, and there is no
         * overlay geometry left to maintain.
         */
        return isNotifications ? (
          <HStack key={item.label} gap={0.5} align="center">
            {button}
            <StatusDot variant="accent" label={t("desktop.menubar.unreadNotifications")} />
          </HStack>
        ) : (
          button
        );
      })}
    </HStack>
  );
}

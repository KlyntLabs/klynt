import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Bell, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MenubarItem, MenubarSchema } from "@/features/desktop/menubar/types";
import styles from "./trailing-actions.module.css";

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
        const Icon = item.icon;
        const isPrimary = item.variant === "primary";
        const label = t(item.label as never);

        if (isPrimary) {
          // Brand orange comes from the klynt theme's accent, not a hardcoded brand hex.
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

        const icon =
          item.label === "desktop.menubar.search" ? (
            <Search />
          ) : item.label === "desktop.menubar.notifications" ? (
            <span className={styles.bell}>
              <Bell />
              <span className={styles.bellDot} />
            </span>
          ) : Icon ? (
            <Icon />
          ) : null;

        return (
          <IconButton
            key={item.label}
            variant="ghost"
            size="sm"
            label={label}
            icon={icon}
            onClick={() => onAction(item)}
          />
        );
      })}
    </HStack>
  );
}

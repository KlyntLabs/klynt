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
    <div className="flex items-center gap-1">
      {schema.trailing.map((item) => {
        if (item.type !== "action") return null;
        const Icon = item.icon;
        const isPrimary = item.variant === "primary";
        const label = t(item.label as never);

        if (isPrimary) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onAction(item)}
              className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[12px] font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              {label}
            </button>
          );
        }

        const icon =
          item.label === "desktop.menubar.search" ? (
            <Search className="size-4" />
          ) : item.label === "desktop.menubar.notifications" ? (
            <div className="relative">
              <Bell className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand ring-1 ring-glass/80" />
            </div>
          ) : Icon ? (
            <Icon className="size-4" />
          ) : null;

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onAction(item)}
            aria-label={label}
            className="flex size-8 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

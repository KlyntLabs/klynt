import type { MenuItem } from "./menu-helpers";

/** An entry in an Astryx DropdownMenu: an action, or a divider between groups. */
export type DropdownEntry = { label: string; onClick?: () => void } | { type: "divider" };

/**
 * Maps our menubar items onto Astryx DropdownMenu's option shape.
 *
 * Note: `MenuItem.shortcut` is dropped. Astryx's DropdownMenu has no slot for a keyboard-
 * shortcut hint, and no menubar schema in the repo actually sets one — the field was
 * plumbed through but never populated. If shortcuts are ever wanted, they need either a
 * swizzled DropdownMenuItem or a custom `children` render function.
 */
export function toDropdownEntries(
  items: MenuItem[],
  translate: (key: string) => string
): DropdownEntry[] {
  return items.map((item) =>
    item.separator ? { type: "divider" } : { label: translate(item.label), onClick: item.onClick }
  );
}

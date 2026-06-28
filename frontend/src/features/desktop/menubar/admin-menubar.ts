import type { MenubarSchema } from "./types";

export const adminMenubar: MenubarSchema = {
  brand: { label: "Klynt" },
  menus: [
    {
      type: "submenu",
      label: "desktop.menubar.file",
      items: [
        { type: "action", label: "desktop.menubar.newWindow", action: { type: "noop" } },
        { type: "separator" },
        { type: "action", label: "desktop.menubar.closeWindow", action: { type: "noop" } },
      ],
    },
    { type: "submenu", label: "desktop.menubar.edit", items: [] },
    {
      type: "submenu",
      label: "desktop.menubar.view",
      items: [
        { type: "action", label: "desktop.menubar.showDesktop", action: { type: "noop" } },
        { type: "action", label: "desktop.menubar.changeBackground", action: { type: "noop" } },
      ],
    },
    { type: "submenu", label: "desktop.menubar.window", items: [{ type: "window-list" }] },
    {
      type: "submenu",
      label: "desktop.menubar.settings",
      items: [{ type: "action", label: "desktop.menubar.adminSettings", action: { type: "noop" } }],
    },
    { type: "submenu", label: "desktop.menubar.help", items: [] },
  ],
  trailing: [],
};

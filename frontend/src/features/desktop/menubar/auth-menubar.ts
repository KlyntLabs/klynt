import type { MenubarSchema } from "./types";

export const authMenubar: MenubarSchema = {
  brand: { label: "Klynt" },
  menus: [
    {
      type: "submenu",
      label: "desktop.menubar.help",
      items: [],
    },
  ],
  trailing: [],
};

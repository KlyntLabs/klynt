export type BackgroundPreset = {
  id: string;
  name: string;
  src: string;
  dark?: boolean;
};

export const backgroundPresets: BackgroundPreset[] = [
  {
    id: "fabric",
    name: "desktop.backgrounds.fabric",
    src: "/wallpapers/fabric.svg",
  },
  {
    id: "graph-paper",
    name: "desktop.backgrounds.graphPaper",
    src: "/wallpapers/graph-paper.svg",
  },
  {
    id: "dots-dark",
    name: "desktop.backgrounds.dotsDark",
    src: "/wallpapers/dots-dark.svg",
    dark: true,
  },
];

export function getPresetById(id: string): BackgroundPreset | undefined {
  return backgroundPresets.find((p) => p.id === id);
}

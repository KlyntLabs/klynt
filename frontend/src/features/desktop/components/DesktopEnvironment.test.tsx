import { screen } from "@testing-library/react";
import { render } from "@/test/render";
import type { DesktopConfig } from "../factory/types";
import { createNoOpAdapter } from "../persistence/no-op-adapter";
import { DesktopEnvironment } from "./DesktopEnvironment";

const mockConfig: DesktopConfig = {
  id: "test",
  title: "Test Desktop",
  apps: [],
  menubar: { brand: { label: "Klynt" }, menus: [], trailing: [] },
  background: { presetId: "fabric" },
  persistence: createNoOpAdapter(),
  context: { user: null },
};

it("renders the desktop title and menubar brand", () => {
  render(<DesktopEnvironment config={mockConfig} />);
  expect(screen.getByText("Klynt")).toBeInTheDocument();
});

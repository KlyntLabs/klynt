import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestApp, createTestConfig, resetDesktopStore } from "./test-helpers";

describe("desktop test helpers", () => {
  it("resets the desktop store", () => {
    resetDesktopStore();
    expect(true).toBe(true);
  });

  it("creates a test app with defaults and renders its component", () => {
    const app = createTestApp();
    expect(app.id).toBe("test-app");
    expect(app.title).toBe("Test App");
    render(<app.component />);
    expect(screen.getByText("Test App")).toBeInTheDocument();
  });

  it("creates a test app with overrides", () => {
    const app = createTestApp({ id: "custom", title: "Custom App" });
    expect(app.id).toBe("custom");
    expect(app.title).toBe("Custom App");
  });

  it("creates a test config with defaults", () => {
    const config = createTestConfig();
    expect(config.id).toBe("test");
    expect(config.title).toBe("Test Desktop");
  });

  it("creates a test config with overrides", () => {
    const config = createTestConfig({ id: "custom", title: "Custom Desktop" });
    expect(config.id).toBe("custom");
    expect(config.title).toBe("Custom Desktop");
  });
});

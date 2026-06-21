import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Toaster } from "./sonner";

describe("Sonner interactions", () => {
  it("renders a toast", async () => {
    const { toast } = await import("sonner");
    render(<Toaster />);
    toast("Hello world");
    expect(await screen.findByText("Hello world")).toBeInTheDocument();
  });

  it("renders with explicit theme", async () => {
    const { toast } = await import("sonner");
    render(<Toaster theme="dark" />);
    toast("Dark toast");
    expect(await screen.findByText("Dark toast")).toBeInTheDocument();
  });

  it("updates theme when class changes", async () => {
    const { toast } = await import("sonner");
    render(<Toaster />);
    document.documentElement.classList.add("dark");
    toast("Themed toast");
    expect(await screen.findByText("Themed toast")).toBeInTheDocument();
    document.documentElement.classList.remove("dark");
  });
});

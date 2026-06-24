import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { MobileFallback } from "./MobileFallback";

describe("MobileFallback", () => {
  it("renders the mobile fallback message", () => {
    render(<MobileFallback />);

    expect(screen.getByText("Desktop only")).toBeInTheDocument();
    expect(
      screen.getByText("This experience is optimized for desktop. Please use a larger screen.")
    ).toBeInTheDocument();
  });
});

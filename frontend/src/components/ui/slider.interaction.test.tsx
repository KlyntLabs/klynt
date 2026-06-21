import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "./slider";

describe("Slider interactions", () => {
  it("renders default slider", () => {
    render(<Slider defaultValue={[50]} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders range slider", () => {
    render(
      <Slider
        defaultValue={[20, 80]}
        aria-label={["Min", "Max"]}
        aria-labelledby={["label-min", "label-max"]}
      />
    );
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("renders vertical slider", () => {
    render(<Slider orientation="vertical" defaultValue={[50]} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders slider with controlled value", () => {
    render(<Slider value={[30]} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders slider fallback to min/max when no value is provided", () => {
    render(<Slider min={10} max={90} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});

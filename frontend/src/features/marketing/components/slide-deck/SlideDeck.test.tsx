import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SlideDeck } from "./SlideDeck";

const slides = [0, 1, 2].map((n) => ({
  id: `s${n}`,
  title: `Slide ${n}`,
  notes: `Notes ${n}`,
  render: () => <div data-testid={`slide-body-${n}`}>Body {n}</div>,
}));

function renderDeck() {
  return render(<SlideDeck slides={slides} prevLabel="Previous" nextLabel="Next" />);
}

describe("SlideDeck navigation", () => {
  it("starts on the first slide with Previous disabled", () => {
    renderDeck();
    expect(screen.getByTestId("slide-body-0")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("advances and rewinds with the Next / Previous buttons", async () => {
    const user = userEvent.setup();
    renderDeck();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("slide-body-1")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByTestId("slide-body-0")).toBeInTheDocument();
  });

  it("jumps to a slide via its thumbnail", async () => {
    const user = userEvent.setup();
    renderDeck();
    // Thumbnails are buttons named by their slide title.
    await user.click(screen.getByRole("button", { name: /Slide 2/ }));
    expect(screen.getByTestId("slide-body-2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("navigates with the keyboard (arrows, Home, End)", () => {
    renderDeck();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("slide-body-1")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("slide-body-0")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByTestId("slide-body-2")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByTestId("slide-body-0")).toBeInTheDocument();
  });

  it("clamps at the ends (no move past first or last)", () => {
    renderDeck();
    fireEvent.keyDown(window, { key: "ArrowLeft" }); // already first
    expect(screen.getByTestId("slide-body-0")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "End" });
    fireEvent.keyDown(window, { key: "ArrowRight" }); // already last
    expect(screen.getByTestId("slide-body-2")).toBeInTheDocument();
  });
});

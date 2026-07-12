import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TypewriterText } from "./TypewriterText";

describe("TypewriterText", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
  });

  it("renders the full text immediately when reduced motion is preferred", () => {
    // The global test setup mocks matchMedia to report reduced motion, so the
    // component should skip the animation and show the whole string at once.
    const { container } = render(<TypewriterText text="Hello world" />);

    expect(container.textContent).toContain("Hello world");
  });

  it("types the text out one character at a time when motion is allowed", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();

    // Advance one animation frame at a time so each tick re-renders and
    // reschedules exactly as it does at runtime.
    const advanceFrames = (frames: number) => {
      for (let i = 0; i < frames; i++) {
        act(() => {
          vi.advanceTimersByTime(80);
        });
      }
    };

    const { container } = render(<TypewriterText text="Hi" speed={80} />);

    // Before any timer fires the word has not been typed yet.
    expect(container.textContent).not.toContain("Hi");

    // Each tick appends one character; after two frames the full word shows.
    advanceFrames(2);
    expect(container.textContent).toContain("Hi");

    // Once the word is complete the typewriter pauses then deletes it back
    // down, so a few frames later the full word is no longer displayed.
    advanceFrames(3);
    expect(container.textContent).not.toContain("Hi");
  });
});

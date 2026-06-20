import "@testing-library/jest-dom/vitest";
import React from "react";
import { apiClient } from "@/core/api/api-client";
import { registerAuthInterceptor } from "@/core/api/auth-interceptor";
import { server } from "@/test/msw/server";

// jsdom does not implement HTMLCanvasElement#getContext; stub it so libraries
// that probe for canvas support do not flood test output with warnings.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

// Respect reduced motion in tests so animated components render statically
// and accessibility checks are stable.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub observers that jsdom does not implement but Radix / carousel libraries require.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
});

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});

// Disable framer-motion animations in tests. We map any `motion.<tag>` to the
// underlying tag so animated marketing pages render without runtime errors.
const framerOnlyProps = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileInView",
  "whileFocus",
  "whileDrag",
  "whileScroll",
  "viewport",
  "layout",
  "layoutId",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "onHoverStart",
  "onHoverEnd",
  "onTap",
  "onTapStart",
  "onTapCancel",
  "onPan",
  "onPanStart",
  "onPanEnd",
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onViewportEnter",
  "onViewportLeave",
  "custom",
  "inherit",
]);

function createMotionStub(Tag: string | React.ComponentType) {
  return function MotionStub(props: Record<string, unknown>) {
    const { children, className, ...rest } = props;
    const safeProps: Record<string, unknown> = {};
    for (const key of Object.keys(rest)) {
      if (!framerOnlyProps.has(key)) {
        safeProps[key] = rest[key];
      }
    }
    return React.createElement(
      Tag as string,
      { className, ...safeProps } as React.HTMLAttributes<HTMLElement>,
      children as React.ReactNode
    );
  };
}

vi.mock("framer-motion", async (importOriginal) => {
  const actual = (await importOriginal<typeof import("framer-motion")>()) || {};
  const motionProxy = new Proxy(
    {},
    {
      get(_, tag: string) {
        return createMotionStub(tag);
      },
    }
  );
  return {
    ...actual,
    motion: motionProxy as typeof import("framer-motion")["motion"],
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  };
});

registerAuthInterceptor(apiClient);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

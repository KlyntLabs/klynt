import "@testing-library/jest-dom/vitest";
import "@/test/dialog-shim";
import "@/test/popover-shim";
import React from "react";
import { apiClient } from "@/core/api/api-client";
import { createAuthInterceptorDeps, registerAuthInterceptor } from "@/core/api/auth-interceptor";
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

// Radix Select and other popover libraries call scrollIntoView on active items.
Element.prototype.scrollIntoView = vi.fn();

// input-otp uses elementFromPoint when focusing slots; jsdom does not implement it.
document.elementFromPoint = () => null;

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
    const dragHandlers: {
      onDragEnd?: (event: unknown, info: { offset: { x: number; y: number } }) => void;
    } = {};
    let isDraggable = false;
    for (const key of Object.keys(rest)) {
      if (key === "drag") {
        isDraggable = Boolean(rest[key]);
      } else if (key === "onDragEnd") {
        dragHandlers.onDragEnd = rest[key] as typeof dragHandlers.onDragEnd;
      } else if (!framerOnlyProps.has(key)) {
        safeProps[key] = rest[key];
      }
    }

    const dragSessionRef = React.useRef<{ startX: number; startY: number } | null>(null);

    const handlePointerDown = (event: React.PointerEvent) => {
      if (isDraggable) {
        dragSessionRef.current = { startX: event.clientX, startY: event.clientY };
      }
      (safeProps.onPointerDown as ((event: unknown) => void) | undefined)?.(event);
    };

    const handlePointerUp = (event: React.PointerEvent) => {
      const session = dragSessionRef.current;
      if (session == null) return;
      dragHandlers.onDragEnd?.(event, {
        offset: {
          x: event.clientX - session.startX,
          y: event.clientY - session.startY,
        },
      });
      dragSessionRef.current = null;
    };

    return React.createElement(
      Tag as string,
      {
        className,
        ...safeProps,
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
      } as React.HTMLAttributes<HTMLElement>,
      children as React.ReactNode
    );
  };
}

vi.mock("framer-motion", async (importOriginal) => {
  const actual = (await importOriginal<typeof import("framer-motion")>()) || {};
  const motionComponentCache = new Map<string, ReturnType<typeof createMotionStub>>();
  const motionProxy = new Proxy(
    {},
    {
      get(_, tag: string) {
        if (!motionComponentCache.has(tag)) {
          motionComponentCache.set(tag, createMotionStub(tag));
        }
        return motionComponentCache.get(tag);
      },
    }
  );
  return {
    ...actual,
    motion: motionProxy as typeof import("framer-motion")["motion"],
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  };
});

registerAuthInterceptor(apiClient, createAuthInterceptorDeps());

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

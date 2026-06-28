import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { AppErrorBoundary } from "./AppErrorBoundary";

function TestFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div>
      <p data-testid="error">{error.message}</p>
      <button type="button" onClick={retry} data-testid="retry">
        Retry
      </button>
    </div>
  );
}

describe("AppErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <AppErrorBoundary fallback={TestFallback}>
        <div data-testid="child">Child content</div>
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Child content");
  });

  it("renders the fallback when a child throws", () => {
    function ThrowingChild(): ReactNode {
      throw new Error("boom");
    }

    render(
      <AppErrorBoundary fallback={TestFallback}>
        <ThrowingChild />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("error")).toHaveTextContent("boom");
  });

  it("retries rendering when the retry action is invoked", () => {
    let shouldThrow = true;

    function ThrowingChild(): ReactNode {
      if (shouldThrow) {
        throw new Error("boom");
      }
      return <div data-testid="child">Child content</div>;
    }

    render(
      <AppErrorBoundary fallback={TestFallback} retryLimit={1}>
        <ThrowingChild />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("error")).toHaveTextContent("boom");

    shouldThrow = false;
    fireEvent.click(screen.getByTestId("retry"));

    expect(screen.getByTestId("child")).toHaveTextContent("Child content");
  });

  it("respects retryLimit and does not retry past the limit", () => {
    function ThrowingChild(): ReactNode {
      throw new Error("boom");
    }

    render(
      <AppErrorBoundary fallback={TestFallback} retryLimit={0}>
        <ThrowingChild />
      </AppErrorBoundary>
    );

    fireEvent.click(screen.getByTestId("retry"));

    expect(screen.getByTestId("error")).toHaveTextContent("boom");
  });
});

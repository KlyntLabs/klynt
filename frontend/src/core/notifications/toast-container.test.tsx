import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToastContainer } from "./toast-container";
import { useToastStore } from "./toast-store";

describe("ToastContainer", () => {
  it("renders toasts from the store", () => {
    useToastStore.getState().reset();
    useToastStore.getState().addToast({ message: "saved", type: "success", duration: 3000 });
    render(<ToastContainer />);
    expect(screen.getByText("saved")).toBeInTheDocument();
  });

  it("renders nothing when there are no toasts", () => {
    useToastStore.getState().reset();
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });
});

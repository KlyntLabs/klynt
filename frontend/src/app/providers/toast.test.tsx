import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { useMutation } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/core/api/api-error";
import { render } from "@/test/render";

/**
 * The app's toast layer.
 *
 * This replaces the tests for the hand-rolled zustand store and its `position: fixed`
 * container, both deleted. Those tests asserted on store internals — that `addToast` appended
 * to an array, that `removeToast` filtered it out, that `clearToasts` emptied it — which is
 * exactly the machinery Astryx now owns inside `ToastViewport`. Re-testing it here would be
 * testing node_modules.
 *
 * What is still ours, and is what these tests cover, is the *wiring*: that `AppProviders`
 * mounts the viewport at all, that `useToast()` called from anywhere below it reaches that
 * viewport, that a toast a caller raises is actually readable on screen and announced, that
 * the user can dismiss it, and that a failing mutation raises the fallback error toast unless
 * it opted out with `meta.suppressToast`.
 *
 * The assertions are on what the user perceives — the message text, the live region, the
 * dismiss button — not on any store, because there is no longer a store to reach into.
 */

function ToastProbe() {
  const toast = useToast();

  return (
    <Button
      label="raise"
      onClick={() => {
        toast({ body: "Layout could not be saved", type: "error", isAutoHide: true });
      }}
    />
  );
}

function MutationProbe({ isSuppressed }: { isSuppressed: boolean }) {
  const mutation = useMutation({
    mutationFn: async () => {
      throw new ApiError({ message: "Something exploded", status: 500, code: "internal" });
    },
    ...(isSuppressed ? { meta: { suppressToast: true } } : {}),
  });

  return <Button label="mutate" onClick={() => mutation.mutate()} />;
}

describe("app toast layer", () => {
  it("shows a toast raised from anywhere in the tree, and dismisses it", async () => {
    const user = userEvent.setup();
    render(<ToastProbe />);

    await user.click(screen.getByRole("button", { name: "raise" }));

    // `role="alert"` is Astryx's live region for an error toast — the announcement the old
    // hand-rolled `aria-live` VStack existed to provide.
    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Layout could not be saved");

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    await waitFor(() => {
      expect(screen.queryByText("Layout could not be saved")).not.toBeInTheDocument();
    });
  });

  it("shows the fallback error toast when a mutation fails", async () => {
    const user = userEvent.setup();
    render(<MutationProbe isSuppressed={false} />);

    await user.click(screen.getByRole("button", { name: "mutate" }));

    expect(await screen.findByText("Something exploded")).toBeInTheDocument();
  });

  it("stays silent for a mutation that opted out with meta.suppressToast", async () => {
    const user = userEvent.setup();
    render(<MutationProbe isSuppressed={true} />);

    await user.click(screen.getByRole("button", { name: "mutate" }));

    await waitFor(() => {
      expect(screen.queryByText("Something exploded")).not.toBeInTheDocument();
    });
  });
});

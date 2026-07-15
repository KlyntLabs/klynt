import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./CustomersPage.stories";

const { Default } = composeStories(stories);

describe("CustomersPage interactions", () => {
  it("filters the customer table with the filter selectors", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.getAllByRole("row")).toHaveLength(17);

    // The three filters are now Astryx Selectors — comboboxes with a listbox popover, not
    // hand-rolled <button> dropdowns. Same user-facing action (open, pick an option), so the
    // queries move from getAllByRole("button", {name: "Any"}) to the combobox/option roles,
    // which also names each control instead of relying on its position on the page.
    await user.click(screen.getByRole("combobox", { name: "product(s) used" }));
    await user.click(await screen.findByRole("option", { name: "Product Analytics" }));
    await waitFor(() => {
      expect(screen.queryByText("Hasura")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: "case study" }));
    await user.click(await screen.findByRole("option", { name: "Has link" }));
    await waitFor(() => {
      expect(screen.getByText("Y Combinator")).toBeInTheDocument();
      expect(screen.queryByText("Mistral AI")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: "featured" }));
    await user.click(await screen.findByRole("option", { name: "TRUE" }));
    await waitFor(() => {
      expect(screen.getByText("Republic")).toBeInTheDocument();
      expect(screen.queryByText("Exa")).not.toBeInTheDocument();
    });
  });
});

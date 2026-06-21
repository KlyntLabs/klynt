import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./CustomersPage.stories";

const { Default } = composeStories(stories);

describe("CustomersPage interactions", () => {
  it("filters the customer table with the custom dropdowns", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.getAllByRole("row")).toHaveLength(17);

    // Product filter -> Product Analytics
    const productDropdown = screen.getAllByRole("button", { name: /^Any$/ })[0];
    await user.click(productDropdown);
    await user.click(screen.getByRole("button", { name: "Product Analytics" }));
    await waitFor(() => {
      expect(screen.queryByText("Hasura")).not.toBeInTheDocument();
    });

    // Case study filter -> Has link
    const caseDropdown = screen.getAllByRole("button", { name: /^Any$/ })[0];
    await user.click(caseDropdown);
    await user.click(screen.getByRole("button", { name: "Has link" }));
    await waitFor(() => {
      expect(screen.getByText("Y Combinator")).toBeInTheDocument();
      expect(screen.queryByText("Mistral AI")).not.toBeInTheDocument();
    });

    // Featured filter -> TRUE
    const featuredDropdown = screen.getAllByRole("button", { name: /^Any$/ })[0];
    await user.click(featuredDropdown);
    await user.click(screen.getByRole("button", { name: "TRUE" }));
    await waitFor(() => {
      expect(screen.getByText("Republic")).toBeInTheDocument();
      expect(screen.queryByText("Exa")).not.toBeInTheDocument();
    });
  });
});

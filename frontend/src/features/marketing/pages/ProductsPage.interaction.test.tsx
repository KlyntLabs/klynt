import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./ProductsPage.stories";

const { Default } = composeStories(stories);

describe("ProductsPage interactions", () => {
  it("copies the install command and shows a success checkmark", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const copyButton = screen.getByTitle("Copy to clipboard");
    expect(copyButton.querySelector(".lucide-copy")).toBeInTheDocument();

    await user.click(copyButton);

    await waitFor(() => {
      expect(copyButton.querySelector(".lucide-check")).toBeInTheDocument();
    });
  });

  it("expands the frameworks list", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.queryByText("Vue")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "21 more" }));
    await waitFor(() => {
      expect(screen.getByText("Vue")).toBeInTheDocument();
    });
  });

  it("expands data platform cards", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "Data sources & import (ELT)" }));
    await waitFor(() => {
      expect(screen.getByText("Postgres")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Reverse ETL & export" }));
    await waitFor(() => {
      expect(screen.getAllByText("BigQuery").length).toBeGreaterThanOrEqual(1);
    });
  });
});

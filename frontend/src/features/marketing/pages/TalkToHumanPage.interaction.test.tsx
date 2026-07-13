import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./TalkToHumanPage.stories";

const { Default } = composeStories(stories);

describe("TalkToHumanPage interactions", () => {
  it("shows validation errors for empty and invalid fields", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText("Please enter your name")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email")).toBeInTheDocument();
    expect(screen.getByText("Please enter a message")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Your name"), "Alice");
    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Your message"), "Hello");

    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.queryByText("Please enter your name")).not.toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
  });

  it("submits the form and shows the success state", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.type(screen.getByLabelText("Your name"), "Alice");
    await user.type(screen.getByLabelText("Email address"), "alice@example.com");

    // The subject control is now an Astryx Selector — a combobox with a listbox popover, not
    // a native <select> — so user.selectOptions() no longer applies. Same user-facing action
    // (choose an option), different mechanics: open the combobox, then click the option.
    await user.click(screen.getByRole("combobox", { name: "What can we help with?" }));
    await user.click(await screen.findByRole("option", { name: "Feature request" }));

    await user.type(screen.getByLabelText("Your message"), "I have a great idea!");

    await user.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(
      () => {
        expect(screen.getByText("Message sent!")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    expect(screen.getByText("We'll be in touch soon.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Send another message" }));
    expect(screen.getByLabelText("Your name")).toHaveValue("");
  });

  it("expands FAQ accordion items", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const trigger = screen.getByRole("button", { name: "How fast do you actually respond?" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    // aria-expanded, not Radix's data-state: Astryx's Collapsible exposes the standard ARIA
    // attribute rather than a library-specific data attribute.
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
    expect(screen.getByText(/Email responses are typically within 24 hours/)).toBeInTheDocument();
  });
});

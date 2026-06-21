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
    await user.selectOptions(screen.getByLabelText("What can we help with?"), "Feature request");
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
    await user.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("data-state", "open");
    });
    expect(screen.getByText(/Email responses are typically within 24 hours/)).toBeInTheDocument();
  });
});

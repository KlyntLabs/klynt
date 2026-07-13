import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { FormSelector } from "./form-selector";

interface Values {
  subject: string;
}

const OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
];

function Harness({
  onSubmit = vi.fn(),
  defaultValue = "",
}: {
  onSubmit?: (values: Values) => void;
  defaultValue?: string;
}) {
  const form = useForm<Values>({ defaultValues: { subject: defaultValue } });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormSelector control={form.control} name="subject" label="Subject" options={OPTIONS} />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("FormSelector", () => {
  it("shows the option currently held by react-hook-form as the selected value", () => {
    render(<Harness defaultValue="support" />);

    // Scoped to the trigger, not screen.getByText: Astryx keeps the Selector's option list
    // mounted even when closed, so every option label is in the DOM regardless of selection.
    // Asserting on presence would pass for an unselected option too.
    expect(screen.getByRole("combobox", { name: /subject/i })).toHaveTextContent("Support");
  });

  it("writes the chosen option back into the form and submits it", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} defaultValue="sales" />);

    await user.click(screen.getByRole("combobox", { name: /subject/i }));
    await user.click(await screen.findByRole("option", { name: "Support" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "support" }),
      expect.anything()
    );
  });
});

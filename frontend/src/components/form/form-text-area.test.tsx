import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { FormTextArea } from "./form-text-area";

interface Values {
  message: string;
}

function Harness({
  onSubmit = vi.fn(),
  defaultValue = "",
  validate,
}: {
  onSubmit?: (values: Values) => void;
  defaultValue?: string;
  validate?: (value: string) => string | true;
}) {
  const form = useForm<Values>({ defaultValues: { message: defaultValue } });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormTextArea
        control={form.control}
        name="message"
        label="Message"
        rules={validate ? { validate } : undefined}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("FormTextArea", () => {
  it("associates the label with the textarea", () => {
    render(<Harness />);

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders the value held by react-hook-form", () => {
    render(<Harness defaultValue="hello" />);

    expect(screen.getByLabelText("Message")).toHaveValue("hello");
  });

  it("writes typed input back into the form and submits it", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ message: "hello" }),
      expect.anything()
    );
  });

  it("surfaces a validation error and marks the field invalid for assistive tech", async () => {
    const user = userEvent.setup();
    render(<Harness validate={(value) => (value ? true : "Message is required")} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Message is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveAttribute("aria-invalid", "true");
  });
});

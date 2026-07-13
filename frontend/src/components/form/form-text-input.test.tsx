import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { FormTextInput } from "./form-text-input";

interface Values {
  email: string;
}

function Harness({
  onSubmit = vi.fn(),
  defaultValue = "",
  validate,
  autoComplete,
}: {
  onSubmit?: (values: Values) => void;
  defaultValue?: string;
  validate?: (value: string) => string | true;
  autoComplete?: string;
}) {
  const form = useForm<Values>({ defaultValues: { email: defaultValue } });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormTextInput
        control={form.control}
        name="email"
        label="Email"
        type="email"
        autoComplete={autoComplete}
        rules={validate ? { validate } : undefined}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("FormTextInput", () => {
  it("associates the label with the input so it is reachable by its accessible name", () => {
    render(<Harness />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the value held by react-hook-form", () => {
    render(<Harness defaultValue="ada@example.com" />);

    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("writes typed input back into the form and submits it", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
      expect.anything()
    );
  });

  it("surfaces a validation error as the input's status message", async () => {
    const user = userEvent.setup();
    render(<Harness validate={(value) => (value ? true : "Email is required")} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
  });

  it("marks the input invalid for assistive tech when validation fails", async () => {
    const user = userEvent.setup();
    render(<Harness validate={(value) => (value ? true : "Email is required")} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    // Astryx's status={{type:'error'}} is what sets aria-invalid — the error must reach it,
    // not merely render as text, or screen readers never learn the field is bad.
    expect(await screen.findByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("does not report invalid while the field is still valid", () => {
    render(<Harness defaultValue="ada@example.com" />);

    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("forwards autoComplete to the input so password managers still work", () => {
    // Astryx's BaseProps extends React.HTMLAttributes, not InputHTMLAttributes, so
    // autoComplete is not in TextInput's prop types even though rest props do reach the
    // input. Auth forms depend on this: without autoComplete, browsers will not offer to
    // fill or save credentials. This test exists to catch it if a future Astryx release
    // stops spreading rest props.
    render(<Harness autoComplete="email" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
  });
});

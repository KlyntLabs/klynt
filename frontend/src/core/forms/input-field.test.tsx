import { screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { InputProps } from "@/components/ui/input";
import { render } from "@/test/render";
import { InputField } from "./input-field";

function TestForm({ children }: { children: React.ReactNode }) {
  const form = useForm();
  return <FormProvider {...form}>{children}</FormProvider>;
}

function FakeInput(props: InputProps) {
  return <input data-testid="fake-input" {...props} />;
}

describe("InputField", () => {
  it("renders the injected Input component", () => {
    render(
      <TestForm>
        <InputField name="email" label="Email" components={{ Input: FakeInput }} />
      </TestForm>
    );

    expect(screen.getByTestId("fake-input")).toBeInTheDocument();
  });

  it("falls back to the default Input component", () => {
    render(
      <TestForm>
        <InputField name="email" label="Email" />
      </TestForm>
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

import { screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { LabelProps } from "@/components/ui/label";
import { render } from "@/test/render";
import { CheckboxField } from "./checkbox-field";

function TestForm({ children }: { children: React.ReactNode }) {
  const form = useForm();
  return <FormProvider {...form}>{children}</FormProvider>;
}

function FakeLabel({ children, htmlFor }: LabelProps) {
  return (
    <span data-testid="fake-label" data-for={htmlFor}>
      {children}
    </span>
  );
}

describe("CheckboxField", () => {
  it("renders the injected Label component", () => {
    render(
      <TestForm>
        <CheckboxField name="terms" label="I agree" components={{ Label: FakeLabel }} />
      </TestForm>
    );

    expect(screen.getByTestId("fake-label")).toHaveTextContent("I agree");
  });

  it("falls back to the default Label component", () => {
    render(
      <TestForm>
        <CheckboxField name="terms" label="I agree" />
      </TestForm>
    );

    expect(screen.getByText("I agree")).toBeInTheDocument();
  });
});

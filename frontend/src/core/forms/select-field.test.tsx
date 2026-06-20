import { screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import type { SelectComponentProps } from "./select-field";
import { SelectField } from "./select-field";

function TestForm({ children }: { children: React.ReactNode }) {
  const form = useForm();
  return <FormProvider {...form}>{children}</FormProvider>;
}

function FakeSelect({ options }: SelectComponentProps) {
  return (
    <select data-testid="fake-select">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const options = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
];

describe("SelectField", () => {
  it("renders the injected Select component", () => {
    render(
      <TestForm>
        <SelectField
          name="role"
          label="Role"
          options={options}
          components={{ Select: FakeSelect }}
        />
      </TestForm>
    );

    expect(screen.getByTestId("fake-select")).toBeInTheDocument();
  });

  it("falls back to the default Select component", () => {
    render(
      <TestForm>
        <SelectField name="role" label="Role" options={options} />
      </TestForm>
    );

    expect(screen.getByLabelText("Role")).toBeInTheDocument();
  });
});

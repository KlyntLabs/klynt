import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./form";
import { Input } from "./input";

function TestForm({ children }: { children: React.ReactNode }) {
  const form = useForm();
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("Form interactions", () => {
  it("renders form field with all helpers", () => {
    render(
      <TestForm>
        <FormField
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>Enter your username.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TestForm>
    );
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Enter your username.")).toBeInTheDocument();
  });

  it("renders form message with children", () => {
    render(
      <TestForm>
        <FormField
          name="email"
          render={() => (
            <FormItem>
              <FormMessage>Custom message</FormMessage>
            </FormItem>
          )}
        />
      </TestForm>
    );
    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";
import { Input } from "./input";

describe("Field interactions", () => {
  it("renders vertical field", () => {
    render(
      <Field>
        <FieldLabel>
          <FieldTitle>Name</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Input />
          <FieldDescription>Help text</FieldDescription>
        </FieldContent>
      </Field>
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Help text")).toBeInTheDocument();
  });

  it("renders horizontal field", () => {
    render(
      <Field orientation="horizontal">
        <FieldLabel>
          <FieldTitle>Email</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Input />
        </FieldContent>
      </Field>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders responsive field", () => {
    render(
      <Field orientation="responsive">
        <FieldLabel>
          <FieldTitle>Phone</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Input />
        </FieldContent>
      </Field>
    );
    expect(screen.getByText("Phone")).toBeInTheDocument();
  });

  it("renders field error with children", () => {
    render(<FieldError>Error message</FieldError>);
    expect(screen.getByText("Error message")).toBeInTheDocument();
  });

  it("renders field error with single error", () => {
    render(<FieldError errors={[{ message: "Required" }]} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders field error with multiple errors", () => {
    render(<FieldError errors={[{ message: "Error 1" }, { message: "Error 2" }]} />);
    expect(screen.getByText("Error 1")).toBeInTheDocument();
    expect(screen.getByText("Error 2")).toBeInTheDocument();
  });

  it("returns null when field error has no content", () => {
    const { container } = render(<FieldError />);
    expect(container.firstChild).toBeNull();
  });

  it("renders field separator with content", () => {
    render(<FieldSeparator>or</FieldSeparator>);
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("renders field separator without content", () => {
    const { container } = render(<FieldSeparator />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders field set and group", () => {
    render(
      <FieldSet>
        <FieldLegend>Legend</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>
              <FieldTitle>First</FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Input />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>
    );
    expect(screen.getByText("Legend")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("renders legend as label variant", () => {
    render(<FieldLegend variant="label">Label legend</FieldLegend>);
    expect(screen.getByText("Label legend")).toBeInTheDocument();
  });
});

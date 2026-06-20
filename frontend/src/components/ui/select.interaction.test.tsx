import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

describe("Select interactions", () => {
  it("renders the open state", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Select a fruit">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("renders all sub-components including groups and separators", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Select" size="sm">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectScrollUpButton />
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana" disabled>
              Banana
            </SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectScrollDownButton />
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Fruits")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Carrot")).toBeInTheDocument();
  });

  it("renders selected value", () => {
    render(
      <Select defaultValue="apple" defaultOpen>
        <SelectTrigger aria-label="Select a fruit">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getAllByText("Apple")).toHaveLength(2);
  });
});

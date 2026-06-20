import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";

describe("InputGroup interactions", () => {
  it("renders input group with inline-start addon", () => {
    render(
      <InputGroup>
        <InputGroupAddon>https://</InputGroupAddon>
        <InputGroupInput placeholder="example.com" />
      </InputGroup>
    );
    expect(screen.getByText("https://")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("example.com")).toBeInTheDocument();
  });

  it("renders input group with inline-end addon", () => {
    render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align="inline-end">.com</InputGroupAddon>
      </InputGroup>
    );
    expect(screen.getByText(".com")).toBeInTheDocument();
  });

  it("renders input group with block-start and block-end addons", () => {
    render(
      <InputGroup>
        <InputGroupAddon align="block-start">Top</InputGroupAddon>
        <InputGroupTextarea />
        <InputGroupAddon align="block-end">Bottom</InputGroupAddon>
      </InputGroup>
    );
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.getByText("Bottom")).toBeInTheDocument();
  });

  it("renders clickable addon as a button", () => {
    const handleClick = vi.fn();
    render(
      <InputGroup>
        <InputGroupAddon onClick={handleClick}>Click</InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    );
    expect(screen.getByText("Click")).toBeInTheDocument();
  });

  it("renders input group text", () => {
    render(
      <InputGroup>
        <InputGroupText>Text</InputGroupText>
        <InputGroupInput />
      </InputGroup>
    );
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("renders input group button variants", () => {
    render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupButton size="sm">Sm</InputGroupButton>
        <InputGroupButton size="icon-xs">Icon</InputGroupButton>
      </InputGroup>
    );
    expect(screen.getByText("Sm")).toBeInTheDocument();
    expect(screen.getByText("Icon")).toBeInTheDocument();
  });
});

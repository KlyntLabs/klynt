import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "./button-group";

describe("ButtonGroup interactions", () => {
  it("renders horizontal button group", () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <ButtonGroupText>Text</ButtonGroupText>
        <Button>Two</Button>
      </ButtonGroup>
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("renders vertical button group", () => {
    render(
      <ButtonGroup orientation="vertical">
        <Button>One</Button>
        <ButtonGroupSeparator />
        <Button>Two</Button>
      </ButtonGroup>
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("renders button group text as child", () => {
    render(
      <ButtonGroup>
        <ButtonGroupText asChild>
          <span>Child text</span>
        </ButtonGroupText>
      </ButtonGroup>
    );
    expect(screen.getByText("Child text")).toBeInTheDocument();
  });
});

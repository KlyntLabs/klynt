import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

describe("Sheet interactions", () => {
  it("renders the open state", () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Close</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText("Sheet description")).toBeInTheDocument();
  });

  it.each(["left", "top", "bottom"] as const)("renders sheet on %s side", (side) => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent side={side} data-testid={`sheet-${side}`}>
          <SheetTitle>{side} sheet</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText(`${side} sheet`)).toBeInTheDocument();
  });
});

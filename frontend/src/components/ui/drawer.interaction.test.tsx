import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

describe("Drawer interactions", () => {
  it("renders the open state", () => {
    render(
      <Drawer defaultOpen>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer title</DrawerTitle>
            <DrawerDescription>Drawer description</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.getByText("Drawer description")).toBeInTheDocument();
  });

  it.each(["top", "left", "right"] as const)("renders drawer direction %s", (direction) => {
    render(
      <Drawer defaultOpen direction={direction}>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>{direction} drawer</DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.getByText(`${direction} drawer`)).toBeInTheDocument();
  });
});

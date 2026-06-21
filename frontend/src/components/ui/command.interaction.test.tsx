import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

describe("Command interactions", () => {
  it("renders the open state", () => {
    render(
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>Calendar</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandItem>
            Settings
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandList>
      </Command>
    );
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });
  it("renders the command dialog open", () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem>Result</CommandItem>
        </CommandList>
      </CommandDialog>
    );
    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta: Meta<typeof Collapsible> = {
  title: "UI/Collapsible",
  component: Collapsible,
};
export default meta;

type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <Collapsible {...args} open={open} onOpenChange={setOpen} className="w-[350px] space-y-2">
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">@peduarte starred 3 repositories</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              Toggle
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/primitives</div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/colors</div>
          <div className="rounded-md border px-4 py-3 font-mono text-sm">@stitches/react</div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
};

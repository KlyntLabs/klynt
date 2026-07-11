import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "./scroll-area";

const meta: Meta<typeof ScrollArea> = {
  title: "UI/ScrollArea",
  component: ScrollArea,
};
export default meta;

type Story = StoryObj<typeof ScrollArea>;

const tags = Array.from({ length: 50 }).map((_, i) => `v1.0.${i}`);

export const Default: Story = {
  render: (args) => (
    <ScrollArea {...args} className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

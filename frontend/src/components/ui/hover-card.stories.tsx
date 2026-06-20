import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

const meta: Meta<typeof HoverCard> = {
  title: "UI/HoverCard",
  component: HoverCard,
};
export default meta;

type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {
  render: (args) => (
    <HoverCard {...args}>
      <HoverCardTrigger>Hover over me</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex justify-between gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@nextjs</h4>
            <p className="text-sm">The React Framework - created and maintained by @vercel.</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { BellIcon, MailIcon, TrashIcon } from "lucide-react";
import { Button } from "./button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item";

const meta: Meta<typeof Item> = {
  title: "UI/Item",
  component: Item,
};
export default meta;

type Story = StoryObj<typeof Item>;

export const Default: Story = {
  render: () => (
    <ItemGroup className="w-[400px]">
      <Item>
        <ItemMedia variant="icon">
          <MailIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>New message</ItemTitle>
          <ItemDescription>You received a new message from the team.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm" aria-label="Delete message">
            <TrashIcon />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item variant="muted">
        <ItemMedia variant="icon">
          <BellIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Reminder</ItemTitle>
          <ItemDescription>Your meeting starts in 15 minutes.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

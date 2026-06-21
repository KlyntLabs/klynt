import type { Meta, StoryObj } from "@storybook/react";
import { Kbd, KbdGroup } from "./kbd";

const meta: Meta<typeof Kbd> = {
  title: "UI/Kbd",
  component: Kbd,
};
export default meta;

type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
  args: {
    children: "⌘",
  },
};

export const Group: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <span>+</span>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

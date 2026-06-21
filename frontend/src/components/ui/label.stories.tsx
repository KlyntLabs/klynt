import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
  title: "UI/Label",
  component: Label,
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: (args) => (
    <div className="grid gap-2">
      <Label {...args} htmlFor="story-label">
        Email
      </Label>
      <Input id="story-label" placeholder="Email" />
    </div>
  ),
  args: {
    children: "Email",
  },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="grid gap-2 group" data-disabled="true">
      <Label {...args} htmlFor="story-label-disabled">
        Email
      </Label>
      <Input id="story-label-disabled" disabled placeholder="Email" />
    </div>
  ),
  args: {
    children: "Email",
  },
};

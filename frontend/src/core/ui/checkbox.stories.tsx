import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  argTypes: {
    disabled: {
      control: "boolean",
    },
    checked: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    id: "story-checkbox",
  },
  decorators: [
    (Story) => (
      <div className="flex items-center space-x-2">
        <Story />
        <Label htmlFor="story-checkbox">Accept terms and conditions</Label>
      </div>
    ),
  ],
};

export const Checked: Story = {
  args: {
    id: "story-checkbox-checked",
    checked: true,
  },
  decorators: Default.decorators,
};

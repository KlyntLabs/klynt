import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  argTypes: {
    hasError: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    placeholder: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
  decorators: [
    (Story) => (
      <div className="space-y-2">
        <Label htmlFor="story-input">Label</Label>
        <Story />
      </div>
    ),
  ],
};

export const WithError: Story = {
  args: {
    hasError: true,
    placeholder: "Invalid input",
  },
  decorators: Default.decorators,
};

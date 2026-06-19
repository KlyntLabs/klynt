import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
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
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
  decorators: [
    (Story) => (
      <div className="space-y-2">
        <Label htmlFor="story-textarea">Label</Label>
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

import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    "aria-label": "Sample textarea",
    placeholder: "Type something...",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "Disabled textarea",
    disabled: true,
    placeholder: "Disabled textarea",
  },
};

export const WithValue: Story = {
  args: {
    "aria-label": "Sample textarea",
    defaultValue: "Hello world",
  },
};

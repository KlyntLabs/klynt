import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    "aria-label": "Sample input",
    placeholder: "Type something...",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "Disabled input",
    disabled: true,
    placeholder: "Disabled input",
  },
};

export const WithValue: Story = {
  args: {
    "aria-label": "Sample input",
    defaultValue: "Hello world",
  },
};

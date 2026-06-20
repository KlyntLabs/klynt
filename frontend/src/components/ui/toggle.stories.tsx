import type { Meta, StoryObj } from "@storybook/react";
import { BoldIcon } from "lucide-react";
import { Toggle } from "./toggle";

const meta: Meta<typeof Toggle> = {
  title: "UI/Toggle",
  component: Toggle,
};
export default meta;

type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
  args: {
    children: "Toggle",
    defaultPressed: true,
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <BoldIcon />
        Bold
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
};

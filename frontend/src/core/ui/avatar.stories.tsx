import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: {
    src: "https://github.com/shadcn.png",
    alt: "Avatar",
    size: "md",
  },
};

export const WithFallback: Story = {
  args: {
    fallback: "Ada Lovelace",
    size: "md",
  },
};

export const DefaultIcon: Story = {
  args: {
    size: "md",
  },
};

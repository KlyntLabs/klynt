import type { Meta, StoryObj } from "@storybook/react";
import TrashPage from "./TrashPage";

const meta: Meta<typeof TrashPage> = {
  title: "Marketing/Trash",
  component: TrashPage,
};

export default meta;
type Story = StoryObj<typeof TrashPage>;

export const Default: Story = {};

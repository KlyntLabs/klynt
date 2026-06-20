import type { Meta, StoryObj } from "@storybook/react";
import CommunityPage from "./CommunityPage";

const meta: Meta<typeof CommunityPage> = {
  title: "Marketing/Community",
  component: CommunityPage,
};

export default meta;
type Story = StoryObj<typeof CommunityPage>;

export const Default: Story = {};

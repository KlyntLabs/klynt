import type { Meta, StoryObj } from "@storybook/react";
import TalkToHumanPage from "./TalkToHumanPage";

const meta: Meta<typeof TalkToHumanPage> = {
  title: "Marketing/TalkToHuman",
  component: TalkToHumanPage,
};

export default meta;
type Story = StoryObj<typeof TalkToHumanPage>;

export const Default: Story = {};

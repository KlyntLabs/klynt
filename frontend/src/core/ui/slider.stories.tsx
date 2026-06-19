import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { Slider } from "./slider";

const meta: Meta<typeof Slider> = {
  title: "UI/Slider",
  component: Slider,
  argTypes: {
    disabled: {
      control: "boolean",
    },
    min: {
      control: "number",
    },
    max: {
      control: "number",
    },
    step: {
      control: "number",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    id: "story-slider",
    defaultValue: [50],
    max: 100,
    step: 1,
    thumbLabel: "Volume",
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] space-y-2">
        <Label htmlFor="story-slider">Volume</Label>
        <Story />
      </div>
    ),
  ],
};

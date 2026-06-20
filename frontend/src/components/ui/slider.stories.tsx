import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Slider } from "./slider";

const meta: Meta<typeof Slider> = {
  title: "UI/Slider",
  component: Slider,
};
export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState([50]);
    return <Slider {...args} value={value} onValueChange={setValue} aria-label="Volume" />;
  },
};

export const Range: Story = {
  render: (args) => {
    const [value, setValue] = useState([25, 75]);
    return <Slider {...args} value={value} onValueChange={setValue} aria-label={["Min", "Max"]} />;
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [30],
    disabled: true,
    "aria-label": "Volume",
  },
};

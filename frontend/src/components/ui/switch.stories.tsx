import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Label } from "./label";
import { Switch } from "./switch";

const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return (
      <Switch {...args} checked={checked} onCheckedChange={setChecked} aria-label="Airplane mode" />
    );
  },
};

export const WithLabel: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex items-center gap-2">
        <Switch id="story-switch" checked={checked} onCheckedChange={setChecked} {...args} />
        <Label htmlFor="story-switch">Airplane mode</Label>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Airplane mode",
  },
};

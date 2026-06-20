import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

function ControlledCheckbox(args: React.ComponentProps<typeof Checkbox>) {
  const [checked, setChecked] = useState<CheckboxPrimitive.CheckedState>(true);
  return (
    <Checkbox {...args} checked={checked} onCheckedChange={setChecked} aria-label="Accept terms" />
  );
}

export const Default: Story = {
  render: (args) => <ControlledCheckbox {...args} />,
};

export const WithLabel: Story = {
  render: (args) => {
    const [checked, setChecked] = useState<CheckboxPrimitive.CheckedState>(true);
    return (
      <div className="flex items-center gap-2">
        <Checkbox id="story-checkbox" checked={checked} onCheckedChange={setChecked} {...args} />
        <Label htmlFor="story-checkbox">Accept terms</Label>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Accept terms",
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta: Meta<typeof RadioGroup> = {
  title: "UI/RadioGroup",
  component: RadioGroup,
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState("comfortable");
    return (
      <RadioGroup {...args} value={value} onValueChange={setValue}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="default" id="r1" />
          <Label htmlFor="r1">Default</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="comfortable" id="r2" />
          <Label htmlFor="r2">Comfortable</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="compact" id="r3" />
          <Label htmlFor="r3">Compact</Label>
        </div>
      </RadioGroup>
    );
  },
};

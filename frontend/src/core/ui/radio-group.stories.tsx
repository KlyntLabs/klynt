import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta: Meta<typeof RadioGroup> = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  argTypes: {
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState("option-one");
    return (
      <RadioGroup
        {...args}
        value={value}
        onValueChange={setValue}
        aria-label="Choose an option"
        className="gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-one" id="option-one" />
          <Label className="mb-0" htmlFor="option-one">
            Option One
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-two" id="option-two" />
          <Label className="mb-0" htmlFor="option-two">
            Option Two
          </Label>
        </div>
      </RadioGroup>
    );
  },
};

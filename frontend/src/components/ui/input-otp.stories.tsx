import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

const meta: Meta<typeof InputOTP> = {
  title: "UI/InputOTP",
  component: InputOTP,
};
export default meta;

type Story = StoryObj<typeof InputOTP>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("123456");
    return (
      <InputOTP maxLength={6} value={value} onChange={setValue} aria-label="One-time password">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <InputOTP maxLength={6} disabled aria-label="One-time password">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

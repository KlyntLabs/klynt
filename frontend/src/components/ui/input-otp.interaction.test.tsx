import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

describe("InputOTP interactions", () => {
  it("renders input otp with slots and separator", () => {
    render(
      <InputOTP maxLength={6}>
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
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders input otp with value to show caret", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <InputOTP maxLength={6} value="123">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} data-testid="active-slot" />
        </InputOTPGroup>
      </InputOTP>
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    await user.click(screen.getByRole("textbox"));
    expect(container.querySelector('[data-testid="active-slot"]')).toBeInTheDocument();
  });
});

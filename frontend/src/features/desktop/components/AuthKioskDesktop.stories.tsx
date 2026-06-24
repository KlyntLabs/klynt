import type { Meta, StoryObj } from "@storybook/react";
import { buildAuthKioskDesktop } from "@/features/desktop/factory/auth-kiosk-desktop";
import { AuthKioskDesktop } from "./AuthKioskDesktop";

const meta: Meta<typeof AuthKioskDesktop> = {
  title: "Desktop/AuthKioskDesktop",
  component: AuthKioskDesktop,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AuthKioskDesktop>;

export const LoginKiosk: Story = {
  args: {
    config: buildAuthKioskDesktop("login"),
  },
};

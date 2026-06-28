import type { Meta, StoryObj } from "@storybook/react";
import { buildAdminDesktop } from "@/features/desktop/factory/admin-desktop";
import { buildMarketingDesktop } from "@/features/desktop/factory/marketing-desktop";
import { buildTenantDesktop } from "@/features/desktop/factory/tenant-desktop";
import { buildUserDesktop } from "@/features/desktop/factory/user-desktop";
import { DesktopEnvironment } from "./DesktopEnvironment";

const meta: Meta<typeof DesktopEnvironment> = {
  title: "Desktop/DesktopEnvironment",
  component: DesktopEnvironment,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof DesktopEnvironment>;

export const MarketingDesktop: Story = {
  args: {
    config: buildMarketingDesktop(),
  },
};

export const AdminDesktop: Story = {
  args: {
    config: buildAdminDesktop({ user: null }),
  },
};

export const UserDesktop: Story = {
  args: {
    config: buildUserDesktop({ user: null }),
  },
};

export const TenantDesktop: Story = {
  args: {
    config: buildTenantDesktop("demo-tenant", "member", null),
  },
};

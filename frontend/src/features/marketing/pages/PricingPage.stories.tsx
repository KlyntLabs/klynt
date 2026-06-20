import type { Meta, StoryObj } from "@storybook/react";
import PricingPage from "./PricingPage";

const meta: Meta<typeof PricingPage> = {
  title: "Marketing/Pricing",
  component: PricingPage,
};

export default meta;
type Story = StoryObj<typeof PricingPage>;

export const Default: Story = {};

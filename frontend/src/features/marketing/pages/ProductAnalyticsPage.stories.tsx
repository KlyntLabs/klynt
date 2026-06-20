import type { Meta, StoryObj } from "@storybook/react";
import ProductAnalyticsPage from "./ProductAnalyticsPage";

const meta: Meta<typeof ProductAnalyticsPage> = {
  title: "Marketing/ProductAnalytics",
  component: ProductAnalyticsPage,
};

export default meta;
type Story = StoryObj<typeof ProductAnalyticsPage>;

export const Default: Story = {};

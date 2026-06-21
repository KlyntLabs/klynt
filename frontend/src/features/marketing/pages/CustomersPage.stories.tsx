import type { Meta, StoryObj } from "@storybook/react";
import CustomersPage from "./CustomersPage";

const meta: Meta<typeof CustomersPage> = {
  title: "Marketing/Customers",
  component: CustomersPage,
};

export default meta;
type Story = StoryObj<typeof CustomersPage>;

export const Default: Story = {};

import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";
import { Button } from "./button";
import { Toaster } from "./sonner";

const meta: Meta<typeof Toaster> = {
  title: "UI/Sonner",
  component: Toaster,
};
export default meta;

type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: (args) => (
    <div>
      <Toaster {...args} />
      <Button
        variant="outline"
        onClick={() =>
          toast("Event has been created", {
            description: "Sunday, December 03, 2023 at 9:00 AM",
          })
        }
      >
        Show Toast
      </Button>
    </div>
  ),
};

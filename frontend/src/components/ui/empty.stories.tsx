import type { Meta, StoryObj } from "@storybook/react";
import { FolderOpenIcon } from "lucide-react";
import { Button } from "./button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";

const meta: Meta<typeof Empty> = {
  title: "UI/Empty",
  component: Empty,
};
export default meta;

type Story = StoryObj<typeof Empty>;

export const Default: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpenIcon />
        </EmptyMedia>
        <EmptyTitle>No items found</EmptyTitle>
        <EmptyDescription>You haven&apos;t created any items yet.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create item</Button>
      </EmptyContent>
    </Empty>
  ),
};

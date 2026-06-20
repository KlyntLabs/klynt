import type { Meta, StoryObj } from "@storybook/react";
import { ClipboardPasteIcon, CopyIcon, ScissorsIcon } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu";

const meta: Meta<typeof ContextMenu> = {
  title: "UI/ContextMenu",
  component: ContextMenu,
};
export default meta;

type Story = StoryObj<typeof ContextMenu>;

export const Default: Story = {
  render: (args) => (
    <ContextMenu {...args}>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem>
          <ScissorsIcon />
          Cut
        </ContextMenuItem>
        <ContextMenuItem>
          <CopyIcon />
          Copy
        </ContextMenuItem>
        <ContextMenuItem>
          <ClipboardPasteIcon />
          Paste
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

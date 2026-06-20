import type { Meta, StoryObj } from "@storybook/react";
import { AspectRatio } from "./aspect-ratio";

const meta: Meta<typeof AspectRatio> = {
  title: "UI/AspectRatio",
  component: AspectRatio,
};
export default meta;

type Story = StoryObj<typeof AspectRatio>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[450px]">
      <AspectRatio {...args} ratio={16 / 9}>
        <img
          src="/vite.svg"
          alt="Vite"
          className="rounded-md object-cover bg-muted w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

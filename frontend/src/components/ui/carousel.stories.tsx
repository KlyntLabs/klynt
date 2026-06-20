import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent } from "./card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";

const meta: Meta<typeof Carousel> = {
  title: "UI/Carousel",
  component: Carousel,
};
export default meta;

type Story = StoryObj<typeof Carousel>;

export const Default: Story = {
  render: (args) => (
    <Carousel {...args} className="w-full max-w-xs">
      <CarouselContent>
        {["One", "Two", "Three", "Four", "Five"].map((label) => (
          <CarouselItem key={label}>
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{label}</span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

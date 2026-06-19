import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <div className="w-[280px] space-y-2">
      <Label htmlFor="story-select">Favorite subject</Label>
      <Select>
        <SelectTrigger id="story-select">
          <SelectValue placeholder="Select a subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="math">Mathematics</SelectItem>
          <SelectItem value="science">Science</SelectItem>
          <SelectItem value="literature">Literature</SelectItem>
          <SelectItem value="history">History</SelectItem>
          <SelectItem value="art">Art</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

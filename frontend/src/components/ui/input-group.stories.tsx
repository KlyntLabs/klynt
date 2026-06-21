import type { Meta, StoryObj } from "@storybook/react";
import { SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./input-group";

const meta: Meta<typeof InputGroup> = {
  title: "UI/InputGroup",
  component: InputGroup,
};
export default meta;

type Story = StoryObj<typeof InputGroup>;

export const Default: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
};

export const WithButton: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupInput placeholder="Enter amount" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>Apply</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithText: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>.com</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "./button-group";

const meta: Meta<typeof ButtonGroup> = {
  title: "UI/ButtonGroup",
  component: ButtonGroup,
};
export default meta;

type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>One</Button>
      <Button>Two</Button>
      <Button>Three</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <ButtonGroup {...args} orientation="vertical">
      <Button>One</Button>
      <Button>Two</Button>
      <Button>Three</Button>
    </ButtonGroup>
  ),
};

export const WithText: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <ButtonGroupText>Price</ButtonGroupText>
      <ButtonGroupSeparator />
      <Button>$10</Button>
      <Button>$20</Button>
      <Button>$30</Button>
    </ButtonGroup>
  ),
};

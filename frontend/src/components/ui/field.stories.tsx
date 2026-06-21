import type { Meta, StoryObj } from "@storybook/react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "./field";
import { Input } from "./input";

const meta: Meta<typeof Field> = {
  title: "UI/Field",
  component: Field,
};
export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: (args) => (
    <Field {...args}>
      <FieldLabel>
        <FieldTitle>Username</FieldTitle>
      </FieldLabel>
      <FieldContent>
        <Input placeholder="Enter username" />
        <FieldDescription>This will be your public display name.</FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const Horizontal: Story = {
  render: (args) => (
    <Field {...args} orientation="horizontal">
      <FieldLabel>
        <FieldTitle>Username</FieldTitle>
      </FieldLabel>
      <FieldContent>
        <Input placeholder="Enter username" />
      </FieldContent>
    </Field>
  ),
};

export const WithError: Story = {
  render: (args) => (
    <Field {...args} data-invalid="true">
      <FieldLabel>
        <FieldTitle>Email</FieldTitle>
      </FieldLabel>
      <FieldContent>
        <Input aria-invalid placeholder="Enter email" />
        <FieldError errors={[{ message: "Please enter a valid email address." }]} />
      </FieldContent>
    </Field>
  ),
};

export const Group: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel>
          <FieldTitle>First name</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Input placeholder="First name" />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>
          <FieldTitle>Last name</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Input placeholder="Last name" />
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

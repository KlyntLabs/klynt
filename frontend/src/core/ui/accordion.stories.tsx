import type { Meta, StoryObj } from "@storybook/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

const meta: Meta<typeof Accordion> = {
  title: "UI/Accordion",
  component: Accordion,
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[350px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Klynt?</AccordionTrigger>
        <AccordionContent>
          Klynt is a foundation-phase education platform built for learners and educators.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. This accordion is built on top of Radix UI primitives and follows WAI-ARIA
          guidelines.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Can I customize it?</AccordionTrigger>
        <AccordionContent>
          Absolutely. Compose the subcomponents and override classes with the className prop.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";

export function PricingFaqSection() {
  const { t } = useTranslation("marketing");
  const faqItems = t("pricing.faq.items", { returnObjects: true }) as unknown as {
    question: string;
    answer: string;
  }[];

  return (
    <Section variant="transparent">
      <VStack gap={6}>
        <Heading level={2}>{t("pricing.faq.title")}</Heading>

        {/* Astryx models an accordion as CollapsibleGroup + Collapsible, not
            Accordion/AccordionItem/Trigger/Content. type="single" preserves the
            one-open-at-a-time behaviour the shadcn version had. */}
        <CollapsibleGroup type="single">
          {faqItems.map((item, index) => (
            <Collapsible
              key={item.question}
              value={`faq-${index}`}
              defaultIsOpen={false}
              trigger={<Text weight="medium">{item.question}</Text>}
            >
              <Text type="supporting">{item.answer}</Text>
            </Collapsible>
          ))}
        </CollapsibleGroup>
      </VStack>
    </Section>
  );
}

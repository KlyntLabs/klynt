import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection() {
  const { t, array } = useMarketingTranslation();
  const faqItems = array<FaqItem>("talkToHuman.faq.items");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.35 }}
    >
      <VStack gap={4}>
        <Heading level={2}>{t("talkToHuman.faq.title")}</Heading>
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
    </motion.div>
  );
}

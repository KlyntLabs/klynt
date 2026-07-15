import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { tween } from "@/core/motion/astryx-motion";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";

/* framer-motion drives the Astryx stack directly rather than a wrapper <div>. */
const MotionVStack = motion.create(VStack);

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection() {
  const { t, array } = useMarketingTranslation();
  const faqItems = array<FaqItem>("talkToHuman.faq.items");

  return (
    <MotionVStack
      gap={4}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={tween("medium-min", { delay: 0.5 })}
    >
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
    </MotionVStack>
  );
}

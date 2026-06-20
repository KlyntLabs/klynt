import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
      className="px-8 py-6 border-t border-[#E5E5E5]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.35 }}
    >
      <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">{t("talkToHuman.faq.title")}</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, idx) => (
          <AccordionItem
            key={item.question}
            value={`faq-${idx}`}
            className="border-b border-[#E5E5E5] last:border-b-0"
          >
            <AccordionTrigger className="text-sm font-medium text-[#1A1A1A] hover:no-underline py-3.5">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-[#6B6B6B] leading-relaxed pb-3.5">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}

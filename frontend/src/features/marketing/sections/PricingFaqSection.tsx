import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function PricingFaqSection() {
  const { t } = useTranslation("marketing");
  const faqItems = t("pricing.faq.items", { returnObjects: true }) as unknown as {
    question: string;
    answer: string;
  }[];

  return (
    <section className="px-6 sm:px-8 py-6 pb-8">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">{t("pricing.faq.title")}</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, i) => (
          <AccordionItem
            key={item.question}
            value={`faq-${i}`}
            className="border-b border-[#E5E5E5]"
          >
            <AccordionTrigger className="text-sm font-medium text-[#1A1A1A] py-4 hover:no-underline hover:text-[#2563EB] transition-colors">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-[#6B6B6B] pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

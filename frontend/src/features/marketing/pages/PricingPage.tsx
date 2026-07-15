import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import {
  PricingCalculatorSection,
  PricingFaqSection,
  PricingHeroSection,
  PricingPlansSection,
  UsagePricingSection,
} from "@/features/marketing/sections";

export default function PricingPage() {
  const { t } = useTranslation("marketing");
  const tk = (key: string, options?: Record<string, unknown>) =>
    t(key as never, options ?? {}) as string;

  return (
    <VStack gap={0} width="100%">
      <PricingHeroSection />
      <PricingPlansSection />
      <UsagePricingSection tk={tk} />
      <PricingCalculatorSection tk={tk} />
      <PricingFaqSection />
    </VStack>
  );
}

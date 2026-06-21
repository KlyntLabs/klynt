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
    <div className="w-full">
      <PricingHeroSection />
      <PricingPlansSection />
      <UsagePricingSection tk={tk} />
      <PricingCalculatorSection tk={tk} />
      <PricingFaqSection />
    </div>
  );
}

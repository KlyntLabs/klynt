import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorRow } from "@/features/marketing/components/pricing";
import { productPricings } from "@/features/marketing/lib/pricing-data";
import { calculateCost } from "@/features/marketing/lib/pricing-helpers";

interface PricingCalculatorSectionProps {
  tk: (key: string, options?: Record<string, unknown>) => string;
}

export function PricingCalculatorSection({ tk }: PricingCalculatorSectionProps) {
  const { t } = useTranslation("marketing");
  const [usage, setUsage] = useState<Record<string, number>>({
    "product-analytics": 500_000,
    "session-replay": 2_500,
    "feature-flags": 500_000,
  });

  const handleUsageChange = useCallback((id: string, value: number) => {
    setUsage((prev) => ({ ...prev, [id]: value }));
  }, []);

  const totalCost = useMemo(() => {
    return productPricings.reduce((sum, p) => sum + calculateCost(usage[p.id] || 0, p), 0);
  }, [usage]);

  return (
    <section className="px-6 sm:px-8 py-6 bg-[#FAFAF8] border-b border-[#E5E5E5]">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">{t("pricing.calculator.title")}</h2>
      <p className="text-sm text-[#6B6B6B] mb-6">{t("pricing.calculator.subtitle")}</p>

      <div className="bg-white rounded-lg border border-[#D1D1D1] p-5">
        {productPricings.map((p) => (
          <CalculatorRow
            key={p.id}
            product={p}
            value={usage[p.id] || 0}
            onChange={(v) => handleUsageChange(p.id, v)}
            tk={tk}
          />
        ))}

        {/* Total */}
        <div className="mt-5 pt-4 border-t border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#6B6B6B]">{t("pricing.calculator.estimatedCost")}</div>
              <div className="text-xs text-[#9CA3AF]">{t("pricing.calculator.estimateNote")}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono text-[#1A1A1A]">
                {totalCost === 0 ? "$0" : `$${totalCost.toFixed(2)}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-full mt-5 px-4 py-2.5 bg-[#F76E18] hover:bg-[#E56310] text-white text-sm font-medium rounded-md transition-colors"
          >
            {t("pricing.calculator.cta")}
          </button>
        </div>
      </div>
    </section>
  );
}

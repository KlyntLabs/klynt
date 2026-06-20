import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { calculateCost, formatNumber } from "@/features/marketing/lib/pricing-helpers";
import type { ProductPricing } from "@/features/marketing/lib/pricing-types";

interface CalculatorRowProps {
  product: ProductPricing;
  value: number;
  onChange: (v: number) => void;
  tk: (key: string, options?: Record<string, unknown>) => string;
}

export function CalculatorRow({ product, value, onChange, tk }: CalculatorRowProps) {
  const cost = useMemo(() => calculateCost(value, product), [value, product]);
  const sliderMax = product.sliderMax;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-[#E5E5E5] last:border-b-0">
      <div className="flex items-center gap-2 w-40 shrink-0">
        {product.icon}
        <span className="text-sm font-medium text-[#1A1A1A]">{tk(product.nameKey)}</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <Slider
          value={[value]}
          min={0}
          max={sliderMax}
          step={Math.max(1, Math.floor(sliderMax / 100))}
          onValueChange={(vals) => onChange(vals[0])}
          className="flex-1"
          aria-label={tk(product.nameKey)}
        />
        <input
          type="text"
          value={formatNumber(value)}
          aria-label={tk("pricing.calculator.usageAmount")}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9KMkm.+\s]/g, "");
            let num = parseInt(raw.replace(/[^0-9]/g, "") || "0", 10);
            if (raw.toLowerCase().includes("m")) num *= 1_000_000;
            if (raw.toLowerCase().includes("k")) num *= 1_000;
            onChange(Math.min(num, sliderMax));
          }}
          className="w-20 px-2 py-1.5 text-sm font-mono text-right border border-[#D1D1D1] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#F76E18]/30"
        />
      </div>
      <div className="w-24 text-right shrink-0">
        <span className="text-sm font-mono font-medium text-[#1A1A1A]">
          {cost === 0 ? "$0" : `$${cost.toFixed(2)}`}
        </span>
        <span className="text-xs text-[#9CA3AF] block">{tk("pricing.calculator.perMonth")}</span>
      </div>
    </div>
  );
}

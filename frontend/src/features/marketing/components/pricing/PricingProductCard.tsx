import { motion } from "framer-motion";
import { formatNumber } from "@/features/marketing/lib/pricing-helpers";
import type { ProductPricing } from "@/features/marketing/lib/pricing-types";

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

interface PricingProductCardProps {
  product: ProductPricing;
  tk: (key: string, options?: Record<string, unknown>) => string;
}

export function PricingProductCard({ product, tk }: PricingProductCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="border border-[#D1D1D1] rounded-lg p-5 bg-white mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {product.icon}
          <span className="font-semibold text-sm text-[#1A1A1A]">{tk(product.nameKey)}</span>
        </div>
        <span className="bg-[#DCFCE7] text-[#166534] text-xs font-medium px-2.5 py-1 rounded-full">
          {tk("pricing.usagePricing.free")} {tk(product.freeLimitKey)}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F5F3EF] font-medium">
            <th className="text-left px-3 py-2 rounded-tl-md">
              {tk("pricing.usagePricing.tierHeader")}
            </th>
            <th className="text-right px-3 py-2 rounded-tr-md">
              {tk("pricing.usagePricing.priceHeader")}
            </th>
          </tr>
        </thead>
        <tbody>
          {product.tiers.map((tier, i) => {
            const previousLimit = product.tiers[i - 1]?.upTo || 0;
            const tierLabel =
              tier.upTo === Infinity
                ? tk("pricing.usagePricing.over", {
                    value: formatNumber(previousLimit),
                  })
                : tk("pricing.usagePricing.upTo", {
                    value: formatNumber(tier.upTo),
                  });

            return (
              <tr key={tier.upTo} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}>
                <td className="px-3 py-2 text-[#1A1A1A]">{tierLabel}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {tier.price === 0 && tier.upTo === Infinity ? (
                    <span className="text-[#6B6B6B]">{tk("pricing.usagePricing.custom")}</span>
                  ) : tier.price === 0 ? (
                    <span className="text-[#22C55E] font-medium">
                      {tk("pricing.usagePricing.free")}
                    </span>
                  ) : (
                    `$${tier.price.toFixed(6)}/${tk(tier.unitKey)}`
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

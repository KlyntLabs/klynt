import type { ProductPricing } from "./pricing-types";

export function calculateCost(usage: number, product: ProductPricing): number {
  if (usage <= product.freeThreshold) return 0;
  let cost = 0;
  let remaining = usage;
  let prevLimit = 0;

  for (const tier of product.tiers) {
    if (remaining <= 0) break;
    const tierVolume = Math.min(remaining, tier.upTo - prevLimit);
    if (tier.price > 0 && tierVolume > 0) {
      cost += tierVolume * tier.price;
    }
    remaining -= tierVolume;
    prevLimit = tier.upTo;
  }

  return cost;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

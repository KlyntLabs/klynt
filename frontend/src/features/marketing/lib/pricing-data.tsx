import { Icon } from "@astryxdesign/core/Icon";
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bot,
  ClipboardList,
  Database,
  Flag,
  Globe,
  PlayCircle,
} from "lucide-react";
import type { ProductPricing } from "./pricing-types";

export const productPricings: ProductPricing[] = [
  {
    id: "product-analytics",
    nameKey: "marketing:data.products.productAnalytics",
    icon: <Icon icon={BarChart3} color="accent" />,
    freeLimitKey: "marketing:pricing.productPricing.productAnalytics.freeLimit",
    unitKey: "marketing:pricing.productPricing.productAnalytics.unit",
    freeThreshold: 1_000_000,
    sliderMax: 10_000_000,
    tiers: [
      {
        upTo: 1_000_000,
        price: 0,
        unitKey: "marketing:pricing.productPricing.productAnalytics.unit",
      },
      {
        upTo: 10_000_000,
        price: 0.00005,
        unitKey: "marketing:pricing.productPricing.productAnalytics.tierUnit",
      },
      {
        upTo: 100_000_000,
        price: 0.000045,
        unitKey: "marketing:pricing.productPricing.productAnalytics.tierUnit",
      },
      {
        upTo: 1_000_000_000,
        price: 0.00004,
        unitKey: "marketing:pricing.productPricing.productAnalytics.tierUnit",
      },
      { upTo: Infinity, price: 0, unitKey: "marketing:pricing.usagePricing.custom" },
    ],
  },
  {
    id: "session-replay",
    nameKey: "marketing:data.products.sessionReplay",
    icon: <Icon icon={PlayCircle} color="error" />,
    freeLimitKey: "marketing:pricing.productPricing.sessionReplay.freeLimit",
    unitKey: "marketing:pricing.productPricing.sessionReplay.unit",
    freeThreshold: 5_000,
    sliderMax: 50_000,
    tiers: [
      { upTo: 5_000, price: 0, unitKey: "marketing:pricing.productPricing.sessionReplay.unit" },
      {
        upTo: 50_000,
        price: 0.005,
        unitKey: "marketing:pricing.productPricing.sessionReplay.tierUnit",
      },
      {
        upTo: 500_000,
        price: 0.004,
        unitKey: "marketing:pricing.productPricing.sessionReplay.tierUnit",
      },
      { upTo: Infinity, price: 0, unitKey: "marketing:pricing.usagePricing.custom" },
    ],
  },
  {
    id: "feature-flags",
    nameKey: "marketing:data.products.featureFlags",
    /*
     * Icon's colour union carries the categorical hues as well as the semantic ones, and
     * `color="blue"` resolves to the same `--color-icon-blue` token the old wrapper span set
     * by hand. The span — and its CSS module — are gone; the hue is a prop.
     */
    icon: <Icon icon={Flag} color="blue" />,
    freeLimitKey: "marketing:pricing.productPricing.featureFlags.freeLimit",
    unitKey: "marketing:pricing.productPricing.featureFlags.unit",
    freeThreshold: 1_000_000,
    sliderMax: 10_000_000,
    tiers: [
      { upTo: 1_000_000, price: 0, unitKey: "marketing:pricing.productPricing.featureFlags.unit" },
      {
        upTo: 10_000_000,
        price: 0.0001,
        unitKey: "marketing:pricing.productPricing.featureFlags.tierUnit",
      },
      {
        upTo: 100_000_000,
        price: 0.00008,
        unitKey: "marketing:pricing.productPricing.featureFlags.tierUnit",
      },
      { upTo: Infinity, price: 0, unitKey: "marketing:pricing.usagePricing.custom" },
    ],
  },
];

export const freeTierIconMap: Record<number, React.ReactNode> = {
  0: <Icon icon={BarChart3} />,
  1: <Icon icon={PlayCircle} />,
  2: <Icon icon={Flag} />,
  3: <Icon icon={Beaker} />,
  4: <Icon icon={ClipboardList} />,
  5: <Icon icon={Database} />,
  6: <Icon icon={Globe} />,
  7: <Icon icon={AlertTriangle} />,
  8: <Icon icon={Bot} />,
  9: <Icon icon={Database} />,
};

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
    icon: <BarChart3 className="w-5 h-5 text-[#F76E18]" />,
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
    icon: <PlayCircle className="w-5 h-5 text-[#DC2626]" />,
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
    icon: <Flag className="w-5 h-5 text-[#2563EB]" />,
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
  0: <BarChart3 className="w-5 h-5" />,
  1: <PlayCircle className="w-5 h-5" />,
  2: <Flag className="w-5 h-5" />,
  3: <Beaker className="w-5 h-5" />,
  4: <ClipboardList className="w-5 h-5" />,
  5: <Database className="w-5 h-5" />,
  6: <Globe className="w-5 h-5" />,
  7: <AlertTriangle className="w-5 h-5" />,
  8: <Bot className="w-5 h-5" />,
  9: <Database className="w-5 h-5" />,
};

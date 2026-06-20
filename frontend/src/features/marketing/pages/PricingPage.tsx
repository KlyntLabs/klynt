import { AnimatePresence, motion } from "framer-motion";
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
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ------------------------------------------------------------------ */
/*  Pricing tiers                                                      */
/* ------------------------------------------------------------------ */
interface PricingTier {
  upTo: number;
  price: number;
  unitKey: string;
}

interface ProductPricing {
  id: string;
  nameKey: string;
  icon: React.ReactNode;
  freeLimitKey: string;
  unitKey: string;
  tiers: PricingTier[];
  sliderMax: number;
  freeThreshold: number;
}

const productPricings: ProductPricing[] = [
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

/* ------------------------------------------------------------------ */
/*  Cost calculator                                                    */
/* ------------------------------------------------------------------ */
function calculateCost(usage: number, product: ProductPricing): number {
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

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

/* ------------------------------------------------------------------ */
/*  Free tier card                                                     */
/* ------------------------------------------------------------------ */
interface FreeTierItem {
  product: string;
  allowance: string;
  icon: React.ReactNode;
  included: boolean;
}

function FreeTierCard({ item }: { item: FreeTierItem }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F3EF]">
      <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-[#6B6B6B] shrink-0">
        {item.icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#1A1A1A]">{item.product}</div>
        <div
          className={`text-xs font-medium ${item.included ? "text-[#22C55E]" : "text-[#22C55E]"}`}
        >
          {item.allowance}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing product card                                               */
/* ------------------------------------------------------------------ */
function PricingProductCard({
  product,
  tk,
}: {
  product: ProductPricing;
  tk: (key: string, options?: Record<string, unknown>) => string;
}) {
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

/* ------------------------------------------------------------------ */
/*  Calculator row                                                     */
/* ------------------------------------------------------------------ */
function CalculatorRow({
  product,
  value,
  onChange,
  tk,
}: {
  product: ProductPricing;
  value: number;
  onChange: (v: number) => void;
  tk: (key: string, options?: Record<string, unknown>) => string;
}) {
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

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export default function PricingPage() {
  const { t } = useTranslation("marketing");
  const tk = (key: string, options?: Record<string, unknown>) =>
    t(key as never, options ?? {}) as string;
  const [planTab, setPlanTab] = useState<"free" | "scale">("free");
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

  const freeTierItems = t("pricing.freeTier.items", { returnObjects: true }) as unknown as {
    product: string;
    allowance: string;
    icon: React.ReactNode;
    included: boolean;
  }[];
  const freeTierIcons = [
    <BarChart3 key="pa" className="w-5 h-5" />,
    <PlayCircle key="sr" className="w-5 h-5" />,
    <Flag key="ff" className="w-5 h-5" />,
    <Beaker key="ex" className="w-5 h-5" />,
    <ClipboardList key="su" className="w-5 h-5" />,
    <Database key="dw" className="w-5 h-5" />,
    <Globe key="wa" className="w-5 h-5" />,
    <AlertTriangle key="et" className="w-5 h-5" />,
    <Bot key="ai" className="w-5 h-5" />,
    <Database key="cdp" className="w-5 h-5" />,
  ];
  const freeTierWithIcons = freeTierItems.map((item, i) => ({
    ...item,
    icon: freeTierIcons[i] ?? <Database className="w-5 h-5" />,
  }));

  const scaleFeatures = t("pricing.scalePlan.features", {
    returnObjects: true,
  }) as unknown as string[];
  const faqItems = t("pricing.faq.items", { returnObjects: true }) as unknown as {
    question: string;
    answer: string;
  }[];

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section className="px-6 sm:px-8 pt-6 sm:pt-7 pb-6 border-b border-[#E5E5E5]">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-4">
          {/* Left: text */}
          <motion.div
            className="flex-[3] min-w-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
          >
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("pricing.hero.title")}
            </h1>
            <p className="text-base text-[#6B6B6B] mb-4 leading-relaxed">
              {t("pricing.hero.body1", { productCount: 10 })}
            </p>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">{t("pricing.hero.body2")}</p>
          </motion.div>

          {/* Right: illustration placeholder */}
          <motion.div
            className="flex-[2] flex flex-col items-center justify-center shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="w-full max-w-[220px] aspect-square rounded-xl bg-[#F5F3EF] border border-[#E5E5E5] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-[#F76E18] mb-2">
                  {t("pricing.hero.statNumber")}
                </div>
                <div className="text-sm text-[#6B6B6B] font-medium">
                  {t("pricing.hero.statLabel")}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#9CA3AF] italic text-center mt-2 max-w-[220px]">
              {t("pricing.hero.caption")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Plan Toggle + Free Tier ── */}
      <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
        {/* Toggle */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex rounded-lg overflow-hidden border border-[#D1D1D1]">
            <button
              type="button"
              onClick={() => setPlanTab("free")}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                planTab === "free"
                  ? "bg-[#F0EDE6] text-[#1A1A1A]"
                  : "bg-white text-[#6B6B6B] hover:bg-[#FAFAF8]"
              }`}
            >
              {t("pricing.planToggle.free")}
            </button>
            <button
              type="button"
              onClick={() => setPlanTab("scale")}
              className={`px-5 py-2 text-sm font-medium transition-colors border-l border-[#D1D1D1] ${
                planTab === "scale"
                  ? "bg-[#F0EDE6] text-[#1A1A1A]"
                  : "bg-white text-[#6B6B6B] hover:bg-[#FAFAF8]"
              }`}
            >
              {t("pricing.planToggle.scale")}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {planTab === "free" ? (
            <motion.div
              key="free"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  {t("pricing.freeTier.title")}
                </h2>
                <p className="text-sm text-[#6B6B6B]">{t("pricing.freeTier.subtitle")}</p>
              </div>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {freeTierWithIcons.map((item) => (
                  <motion.div key={item.product} variants={staggerItem}>
                    <FreeTierCard item={item} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="scale"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  {t("pricing.scalePlan.title")}
                </h2>
                <p className="text-sm text-[#6B6B6B]">{t("pricing.scalePlan.subtitle")}</p>
              </div>
              <div className="max-w-lg mx-auto">
                <div className="border border-[#D1D1D1] rounded-lg p-6 bg-white">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-[#1A1A1A]">
                      {t("pricing.scalePlan.price")}
                    </span>
                    <span className="text-sm text-[#6B6B6B]">
                      {t("pricing.scalePlan.priceSuffix")}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {scaleFeatures.map((feature, i) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        {i === 0 ? (
                          <span className="text-[#6B6B6B] font-medium">{feature}</span>
                        ) : (
                          <>
                            <span className="text-[#22C55E] mt-0.5">&#10003;</span>
                            <span className="text-[#1A1A1A]">{feature}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="w-full mt-5 px-4 py-2.5 bg-[#F76E18] hover:bg-[#E56310] text-white text-sm font-medium rounded-md transition-colors"
                  >
                    {t("pricing.scalePlan.cta")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Usage-Based Pricing ── */}
      <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          {t("pricing.usagePricing.title")}
        </h2>
        <p className="text-sm text-[#6B6B6B] mb-6">{t("pricing.usagePricing.subtitle")}</p>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {productPricings.map((p) => (
            <PricingProductCard key={p.id} product={p} tk={tk} />
          ))}
        </motion.div>
      </section>

      {/* ── Pricing Calculator ── */}
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
                <div className="text-sm text-[#6B6B6B]">
                  {t("pricing.calculator.estimatedCost")}
                </div>
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

      {/* ── FAQ ── */}
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
    </div>
  );
}

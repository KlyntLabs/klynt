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
/*  Free tier data                                                     */
/* ------------------------------------------------------------------ */
const freeTierItems = [
  {
    product: "Product Analytics",
    allowance: "1M events/mo",
    icon: <BarChart3 className="w-5 h-5" />,
    included: false,
  },
  {
    product: "Session Replay",
    allowance: "5K sessions/mo",
    icon: <PlayCircle className="w-5 h-5" />,
    included: false,
  },
  {
    product: "Feature Flags",
    allowance: "1M API calls/mo",
    icon: <Flag className="w-5 h-5" />,
    included: false,
  },
  {
    product: "Experiments",
    allowance: "Included with FF",
    icon: <Beaker className="w-5 h-5" />,
    included: true,
  },
  {
    product: "Surveys",
    allowance: "250 responses/mo",
    icon: <ClipboardList className="w-5 h-5" />,
    included: false,
  },
  {
    product: "Data Warehouse",
    allowance: "1M rows/mo",
    icon: <Database className="w-5 h-5" />,
    included: false,
  },
  {
    product: "Web Analytics",
    allowance: "1M events/mo",
    icon: <Globe className="w-5 h-5" />,
    included: false,
  },
  {
    product: "Error Tracking",
    allowance: "100K exceptions/mo",
    icon: <AlertTriangle className="w-5 h-5" />,
    included: false,
  },
  {
    product: "AI Analytics",
    allowance: "Included",
    icon: <Bot className="w-5 h-5" />,
    included: true,
  },
  { product: "CDP", allowance: "Included", icon: <Database className="w-5 h-5" />, included: true },
];

const scaleFeatures = [
  "Everything in Free, plus:",
  "SSO & SAML authentication",
  "Advanced permissions & roles",
  "Custom data retention policies",
  "Priority email support",
  "Higher usage limits",
  "Dedicated onboarding",
  "99.99% SLA",
  "$199/month base + usage",
];

/* ------------------------------------------------------------------ */
/*  Pricing tiers                                                      */
/* ------------------------------------------------------------------ */
interface PricingTier {
  upTo: number;
  price: number;
  unit: string;
}

interface ProductPricing {
  id: string;
  name: string;
  icon: React.ReactNode;
  freeLimit: string;
  unit: string;
  tiers: PricingTier[];
  sliderMax: number;
  freeThreshold: number;
}

const productPricings: ProductPricing[] = [
  {
    id: "product-analytics",
    name: "Product Analytics",
    icon: <BarChart3 className="w-5 h-5 text-[#F76E18]" />,
    freeLimit: "1M events",
    unit: "events",
    freeThreshold: 1_000_000,
    sliderMax: 10_000_000,
    tiers: [
      { upTo: 1_000_000, price: 0, unit: "events" },
      { upTo: 10_000_000, price: 0.00005, unit: "event" },
      { upTo: 100_000_000, price: 0.000045, unit: "event" },
      { upTo: 1_000_000_000, price: 0.00004, unit: "event" },
      { upTo: Infinity, price: 0, unit: "contact us" },
    ],
  },
  {
    id: "session-replay",
    name: "Session Replay",
    icon: <PlayCircle className="w-5 h-5 text-[#DC2626]" />,
    freeLimit: "5K sessions",
    unit: "sessions",
    freeThreshold: 5_000,
    sliderMax: 50_000,
    tiers: [
      { upTo: 5_000, price: 0, unit: "sessions" },
      { upTo: 50_000, price: 0.005, unit: "session" },
      { upTo: 500_000, price: 0.004, unit: "session" },
      { upTo: Infinity, price: 0, unit: "contact us" },
    ],
  },
  {
    id: "feature-flags",
    name: "Feature Flags",
    icon: <Flag className="w-5 h-5 text-[#2563EB]" />,
    freeLimit: "1M requests",
    unit: "requests",
    freeThreshold: 1_000_000,
    sliderMax: 10_000_000,
    tiers: [
      { upTo: 1_000_000, price: 0, unit: "requests" },
      { upTo: 10_000_000, price: 0.0001, unit: "request" },
      { upTo: 100_000_000, price: 0.00008, unit: "request" },
      { upTo: Infinity, price: 0, unit: "contact us" },
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
function FreeTierCard({ item }: { item: (typeof freeTierItems)[number] }) {
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
function PricingProductCard({ product }: { product: ProductPricing }) {
  return (
    <motion.div
      variants={staggerItem}
      className="border border-[#D1D1D1] rounded-lg p-5 bg-white mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {product.icon}
          <span className="font-semibold text-sm text-[#1A1A1A]">{product.name}</span>
        </div>
        <span className="bg-[#DCFCE7] text-[#166534] text-xs font-medium px-2.5 py-1 rounded-full">
          Free up to {product.freeLimit}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F5F3EF] font-medium">
            <th className="text-left px-3 py-2 rounded-tl-md">Tier</th>
            <th className="text-right px-3 py-2 rounded-tr-md">Price</th>
          </tr>
        </thead>
        <tbody>
          {product.tiers.map((tier, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}>
              <td className="px-3 py-2 text-[#1A1A1A]">
                {tier.upTo === Infinity
                  ? `${formatNumber(product.tiers[i - 1]?.upTo || 0)}+`
                  : `Up to ${formatNumber(tier.upTo)}`}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {tier.price === 0 && tier.upTo === Infinity ? (
                  <span className="text-[#6B6B6B]">Custom</span>
                ) : tier.price === 0 ? (
                  <span className="text-[#22C55E] font-medium">Free</span>
                ) : (
                  `$${tier.price.toFixed(6)}/${tier.unit}`
                )}
              </td>
            </tr>
          ))}
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
}: {
  product: ProductPricing;
  value: number;
  onChange: (v: number) => void;
}) {
  const cost = useMemo(() => calculateCost(value, product), [value, product]);
  const sliderMax = product.sliderMax;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-[#E5E5E5] last:border-b-0">
      <div className="flex items-center gap-2 w-40 shrink-0">
        {product.icon}
        <span className="text-sm font-medium text-[#1A1A1A]">{product.name}</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <Slider
          value={[value]}
          min={0}
          max={sliderMax}
          step={Math.max(1, Math.floor(sliderMax / 100))}
          onValueChange={(vals) => onChange(vals[0])}
          className="flex-1"
        />
        <input
          type="text"
          value={formatNumber(value)}
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
        <span className="text-xs text-[#9CA3AF] block">/mo</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */
const faqItems = [
  {
    question: "What happens when I exceed my free tier?",
    answer:
      "You only pay for usage beyond the free tier. We'll never charge you without warning. You can set up billing alerts to get notified when you're approaching your limits.",
  },
  {
    question: "Can I use PostHog for free forever?",
    answer:
      "Yes! More than 90% of companies use PostHog for free. The free tier resets every month, so you get the same generous allowance continuously.",
  },
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. You can use PostHog's full free tier without any payment information. We only ask for billing details when you choose to upgrade for higher limits.",
  },
  {
    question: "What is the difference between Free and Scale plans?",
    answer:
      "Scale adds higher usage limits, SSO/SAML authentication, advanced permissions, custom data retention, and dedicated support. The base price is $199/month plus usage.",
  },
  {
    question: "Can I self-host PostHog?",
    answer:
      "Yes, we offer a self-hosted option for enterprise customers who need to keep data on their own infrastructure. Contact our sales team for details.",
  },
  {
    question: "How does usage-based pricing work?",
    answer:
      "You pay per unit (event, session, API call) beyond your free tier. There are no flat fees or hidden charges. Pricing tiers get cheaper per unit as your volume increases.",
  },
  {
    question: "Is there an annual discount?",
    answer:
      "Yes, annual plans include a discount. Contact us for details on enterprise pricing and custom annual agreements.",
  },
  {
    question: "What support do I get?",
    answer:
      "Free plans include community support via our forums and Slack. Scale plans get priority email support. Enterprise plans include a dedicated support engineer.",
  },
];

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export default function PricingPage() {
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
              PostHog Cloud
            </h1>
            <p className="text-base text-[#6B6B6B] mb-4 leading-relaxed">
              PostHog is designed to grow with you. Our <strong>10+</strong> products (and counting)
              will take you from idea to product-market fit to IPO and beyond.
            </p>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">
              Our generous free tier means more than 90% of companies use PostHog for free. Only add
              a card if you need more than the free tier limits, advanced features, or want more
              projects. You still keep the same monthly free volume, even after upgrading.
            </p>
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
                <div className="text-6xl font-bold text-[#F76E18] mb-2">3000</div>
                <div className="text-sm text-[#6B6B6B] font-medium">PostHog</div>
              </div>
            </div>
            <p className="text-xs text-[#9CA3AF] italic text-center mt-2 max-w-[220px]">
              The latest version of PostHog comes with 10+ products, generous free tiers, and
              usage-based pricing.
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
              onClick={() => setPlanTab("free")}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                planTab === "free"
                  ? "bg-[#F0EDE6] text-[#1A1A1A]"
                  : "bg-white text-[#6B6B6B] hover:bg-[#FAFAF8]"
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setPlanTab("scale")}
              className={`px-5 py-2 text-sm font-medium transition-colors border-l border-[#D1D1D1] ${
                planTab === "scale"
                  ? "bg-[#F0EDE6] text-[#1A1A1A]"
                  : "bg-white text-[#6B6B6B] hover:bg-[#FAFAF8]"
              }`}
            >
              Scale
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
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Free tier on all plans</h2>
                <p className="text-sm text-[#6B6B6B]">Our generous free tier resets monthly</p>
              </div>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {freeTierItems.map((item) => (
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
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Scale plan</h2>
                <p className="text-sm text-[#6B6B6B]">For growing teams that need more</p>
              </div>
              <div className="max-w-lg mx-auto">
                <div className="border border-[#D1D1D1] rounded-lg p-6 bg-white">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-[#1A1A1A]">$199</span>
                    <span className="text-sm text-[#6B6B6B]">/month base + usage</span>
                  </div>
                  <ul className="space-y-2">
                    {scaleFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
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
                  <button className="w-full mt-5 px-4 py-2.5 bg-[#F76E18] hover:bg-[#E56310] text-white text-sm font-medium rounded-md transition-colors">
                    Upgrade to Scale
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Usage-Based Pricing ── */}
      <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Usage-based pricing</h2>
        <p className="text-sm text-[#6B6B6B] mb-6">
          Once you exceed your free tier, you only pay for what you use. No hidden fees, no
          surprises.
        </p>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {productPricings.map((p) => (
            <PricingProductCard key={p.id} product={p} />
          ))}
        </motion.div>
      </section>

      {/* ── Pricing Calculator ── */}
      <section className="px-6 sm:px-8 py-6 bg-[#FAFAF8] border-b border-[#E5E5E5]">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Pricing calculator</h2>
        <p className="text-sm text-[#6B6B6B] mb-6">Estimate your monthly cost based on usage</p>

        <div className="bg-white rounded-lg border border-[#D1D1D1] p-5">
          {productPricings.map((p) => (
            <CalculatorRow
              key={p.id}
              product={p}
              value={usage[p.id] || 0}
              onChange={(v) => handleUsageChange(p.id, v)}
            />
          ))}

          {/* Total */}
          <div className="mt-5 pt-4 border-t border-[#E5E5E5]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B6B6B]">Estimated monthly cost</div>
                <div className="text-xs text-[#9CA3AF]">
                  This is an estimate. You pay nothing until you exceed your free tier.
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold font-mono text-[#1A1A1A]">
                  {totalCost === 0 ? "$0" : `$${totalCost.toFixed(2)}`}
                </div>
              </div>
            </div>
            <button className="w-full mt-5 px-4 py-2.5 bg-[#F76E18] hover:bg-[#E56310] text-white text-sm font-medium rounded-md transition-colors">
              Get started for free
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 sm:px-8 py-6 pb-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-b border-[#E5E5E5]">
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

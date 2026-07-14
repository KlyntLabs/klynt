import { HStack } from "@astryxdesign/core/HStack";
import { Slider } from "@astryxdesign/core/Slider";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useMemo } from "react";
import { calculateCost, formatNumber } from "@/features/marketing/lib/pricing-helpers";
import type { ProductPricing } from "@/features/marketing/lib/pricing-types";
import styles from "./calculator-row.module.css";

interface CalculatorRowProps {
  product: ProductPricing;
  value: number;
  onChange: (v: number) => void;
  tk: (key: string, options?: Record<string, unknown>) => string;
}

export function CalculatorRow({ product, value, onChange, tk }: CalculatorRowProps) {
  const cost = useMemo(() => calculateCost(value, product), [value, product]);
  const sliderMax = product.sliderMax;

  const handleUsageInput = (raw: string) => {
    const cleaned = raw.replace(/[^0-9KMkm.+\s]/g, "");
    let num = parseInt(cleaned.replace(/[^0-9]/g, "") || "0", 10);
    if (cleaned.toLowerCase().includes("m")) num *= 1_000_000;
    if (cleaned.toLowerCase().includes("k")) num *= 1_000;
    onChange(Math.min(num, sliderMax));
  };

  return (
    <div className={styles.row}>
      <HStack gap={2} align="center" className={styles.name}>
        {product.icon}
        <Text type="label">{tk(product.nameKey)}</Text>
      </HStack>

      <HStack gap={3} align="center" className={styles.controls}>
        <Slider
          label={tk(product.nameKey)}
          isLabelHidden
          value={value}
          min={0}
          max={sliderMax}
          step={Math.max(1, Math.floor(sliderMax / 100))}
          onChange={
            ((next: number) => onChange(next)) as (value: number | [number, number]) => void
          }
          className={styles.slider}
        />
        <TextInput
          label={tk("pricing.calculator.usageAmount")}
          isLabelHidden
          size="sm"
          width={80}
          value={formatNumber(value)}
          onChange={handleUsageInput}
          className={styles.usageInput}
        />
      </HStack>

      <VStack gap={0} align="end" className={styles.cost}>
        <Text type="label" hasTabularNumbers>
          {cost === 0 ? "$0" : `$${cost.toFixed(2)}`}
        </Text>
        <Text type="supporting" color="disabled" display="block">
          {tk("pricing.calculator.perMonth")}
        </Text>
      </VStack>
    </div>
  );
}

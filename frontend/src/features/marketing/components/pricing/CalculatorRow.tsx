import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Slider } from "@astryxdesign/core/Slider";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useMemo } from "react";
import { calculateCost, formatNumber } from "@/features/marketing/lib/pricing-helpers";
import type { ProductPricing } from "@/features/marketing/lib/pricing-types";
import styles from "./calculator-row.module.css";

/** The usage field's width. Above the spacing scale, so it rides TextInput's own `width` prop
 *  (`SizeValue`: "numbers are treated as pixels") rather than the stylesheet. */
const USAGE_INPUT_WIDTH = 80;

/**
 * The narrowest a cell may get before name / controls / cost stack.
 *
 * This replaces the row's 640px media query outright. Astryx's Grid reflows on the container, so
 * the row goes three-up when the calculator card is wide and stacks when it is not — no
 * breakpoint, no flex ratios. The three cells are equal tracks now; they were 160px / fill / 96px
 * before, so the slider is narrower and the name and cost bands are wider.
 */
const CELL_MIN_WIDTH = 200;
const CELLS = 3;

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
    /* Grid exposes no padding prop (columns / gap / size / alignment only), so the row's block
       rhythm rides the stack that holds it. The 1px rule that used to close each row is an Astryx
       `Divider`, drawn between the rows by PricingCalculatorSection. */
    <VStack paddingBlock={4}>
      <Grid columns={{ minWidth: CELL_MIN_WIDTH, max: CELLS }} gap={3} align="center">
        <HStack gap={2} align="center">
          {product.icon}
          <Text type="label">{tk(product.nameKey)}</Text>
        </HStack>

        <HStack gap={3} align="center">
          {/* `StackItem size="fill"` is Astryx's own prop for flex:1 — it is what took the
              `.slider` and `.controls` flex rules out of the stylesheet. */}
          <StackItem size="fill">
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
            />
          </StackItem>
          <TextInput
            label={tk("pricing.calculator.usageAmount")}
            isLabelHidden
            size="sm"
            width={USAGE_INPUT_WIDTH}
            value={formatNumber(value)}
            onChange={handleUsageInput}
            className={styles.usageInput}
          />
        </HStack>

        <VStack gap={0} align="end">
          <Text type="label" hasTabularNumbers>
            {cost === 0 ? "$0" : `$${cost.toFixed(2)}`}
          </Text>
          <Text type="supporting" color="disabled" display="block">
            {tk("pricing.calculator.perMonth")}
          </Text>
        </VStack>
      </Grid>
    </VStack>
  );
}

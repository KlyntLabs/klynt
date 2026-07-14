import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorRow } from "@/features/marketing/components/pricing";
import { productPricings } from "@/features/marketing/lib/pricing-data";
import { calculateCost } from "@/features/marketing/lib/pricing-helpers";
import styles from "./pricing-calculator-section.module.css";

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
    <Section variant="muted" padding={6} dividers={["bottom"]}>
      <VStack gap={6}>
        <VStack gap={2}>
          <Heading level={2}>{t("pricing.calculator.title")}</Heading>
          <Text type="supporting">{t("pricing.calculator.subtitle")}</Text>
        </VStack>

        <Card padding={5}>
          <VStack gap={5}>
            <div>
              {productPricings.map((p) => (
                <CalculatorRow
                  key={p.id}
                  product={p}
                  value={usage[p.id] || 0}
                  onChange={(v) => handleUsageChange(p.id, v)}
                  tk={tk}
                />
              ))}
            </div>

            <Divider />

            <VStack gap={5}>
              <HStack justify="between" align="center" gap={4}>
                <VStack gap={0.5} align="start">
                  <Text type="supporting">{t("pricing.calculator.estimatedCost")}</Text>
                  <Text type="supporting" size="xsm" color="disabled">
                    {t("pricing.calculator.estimateNote")}
                  </Text>
                </VStack>
                <Text size="3xl" weight="bold" hasTabularNumbers justify="end">
                  {totalCost === 0 ? "$0" : `$${totalCost.toFixed(2)}`}
                </Text>
              </HStack>

              <div className={styles.blockAction}>
                <Button variant="primary" label={t("pricing.calculator.cta")} />
              </div>
            </VStack>
          </VStack>
        </Card>
      </VStack>
    </Section>
  );
}

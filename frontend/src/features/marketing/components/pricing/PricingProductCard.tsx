import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { formatNumber } from "@/features/marketing/lib/pricing-helpers";
import type { ProductPricing } from "@/features/marketing/lib/pricing-types";
import styles from "./pricing-product-card.module.css";

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/** Astryx's Table constrains its row type to Record<string, unknown>. */
interface TierRow extends Record<string, unknown> {
  id: string;
  label: string;
  price: number;
  unitKey: string;
  isUnbounded: boolean;
}

interface PricingProductCardProps {
  product: ProductPricing;
  tk: (key: string, options?: Record<string, unknown>) => string;
}

export function PricingProductCard({ product, tk }: PricingProductCardProps) {
  const rows: TierRow[] = product.tiers.map((tier, i) => {
    const previousLimit = product.tiers[i - 1]?.upTo || 0;
    const isUnbounded = tier.upTo === Infinity;

    return {
      id: String(tier.upTo),
      label: isUnbounded
        ? tk("pricing.usagePricing.over", { value: formatNumber(previousLimit) })
        : tk("pricing.usagePricing.upTo", { value: formatNumber(tier.upTo) }),
      price: tier.price,
      unitKey: tier.unitKey,
      isUnbounded,
    };
  });

  const renderPrice = (row: TierRow) => {
    if (row.price === 0 && row.isUnbounded) {
      return <Text color="secondary">{tk("pricing.usagePricing.custom")}</Text>;
    }
    if (row.price === 0) {
      return (
        <Text weight="medium" className={styles.free}>
          {tk("pricing.usagePricing.free")}
        </Text>
      );
    }
    return <Text hasTabularNumbers>{`$${row.price.toFixed(6)}/${tk(row.unitKey)}`}</Text>;
  };

  const columns: TableColumn<TierRow>[] = [
    {
      key: "label",
      header: tk("pricing.usagePricing.tierHeader"),
      width: proportional(1),
      renderCell: (row: TierRow) => <Text>{row.label}</Text>,
    },
    {
      key: "price",
      header: tk("pricing.usagePricing.priceHeader"),
      width: proportional(1),
      align: "end",
      renderCell: renderPrice,
    },
  ];

  return (
    <motion.div variants={staggerItem} className={styles.card}>
      <Card padding={5}>
        <VStack gap={4}>
          <HStack gap={2} align="center" justify="between">
            <HStack gap={2} align="center">
              {product.icon}
              <Text type="label" weight="semibold">
                {tk(product.nameKey)}
              </Text>
            </HStack>
            <Badge
              variant="green"
              label={`${tk("pricing.usagePricing.free")} ${tk(product.freeLimitKey)}`}
            />
          </HStack>

          <Table
            data={rows}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="none"
            isStriped
          />
        </VStack>
      </Card>
    </motion.div>
  );
}

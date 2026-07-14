import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ProductItem } from "@/features/marketing/data/products";
import { ProductIcon } from "./ProductIcon";
import styles from "./product-card.module.css";

interface ProductCardProps {
  product: ProductItem;
  tk: (key: string) => string;
}

export function ProductCard({ product, tk }: ProductCardProps) {
  const label = tk(product.labelKey);

  return (
    <ClickableCard variant="transparent" padding={3} href={product.route} label={label}>
      <HStack gap={3} align="center">
        <ProductIcon name={product.icon} />
        <VStack gap={0} align="start" className={styles.body}>
          <Text weight="medium" display="block">
            {label}
          </Text>
          {product.descriptionKey && (
            <Text type="supporting" size="2xs" color="disabled" display="block" maxLines={1}>
              {tk(product.descriptionKey)}
            </Text>
          )}
        </VStack>
      </HStack>
    </ClickableCard>
  );
}

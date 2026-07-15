import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import type { ProductItem } from "@/features/marketing/data/products";
import { staggerItem } from "./constants";
import { ProductIcon } from "./ProductIcon";
import styles from "./product-card.module.css";

/*
 * The card *is* the stagger item — framer-motion drives the Astryx ClickableCard directly rather
 * than a wrapper <div> around it. Astryx components keep `ref`/`style`/`className`, so
 * `motion.create()` composes with one; that is the native path (see Window.tsx).
 *
 * ProductCatalog is the only caller, and it always renders these inside a stagger container, so
 * the variants belong here rather than being threaded through as a prop.
 */
const MotionClickableCard = motion.create(ClickableCard);

interface ProductCardProps {
  product: ProductItem;
  tk: (key: string) => string;
}

export function ProductCard({ product, tk }: ProductCardProps) {
  const label = tk(product.labelKey);

  return (
    <MotionClickableCard
      variant="transparent"
      padding={3}
      href={product.route}
      label={label}
      variants={staggerItem}
    >
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
    </MotionClickableCard>
  );
}

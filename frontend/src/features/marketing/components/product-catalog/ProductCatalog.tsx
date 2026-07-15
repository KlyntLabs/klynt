import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tween } from "@/core/motion/astryx-motion";
import {
  tab1Products,
  tab3Products,
  tab4Automation,
  tab4FeatureDev,
  tab4Feedback,
} from "@/features/marketing/data/products";
import { staggerContainer } from "./constants";
import { ProductCard } from "./ProductCard";

/*
 * framer-motion drives the Astryx components themselves — the category *is* the fading VStack and
 * the grid *is* the stagger container. No wrapper <div> survives. (staggerItem now lives on
 * ProductCard, which is the stagger item.)
 */
const MotionVStack = motion.create(VStack);
const MotionGrid = motion.create(Grid);

interface ProductCategoryProps {
  title: string;
  products: typeof tab1Products;
  tk: (key: string) => string;
}

function ProductCategory({ title, products, tk }: ProductCategoryProps) {
  return (
    <MotionVStack
      gap={4}
      align="stretch"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={tween("medium-min")}
    >
      <Heading level={3}>{title}</Heading>
      <MotionGrid
        columns={{ minWidth: 260, max: 3 }}
        gap={1}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} tk={tk} />
        ))}
      </MotionGrid>
    </MotionVStack>
  );
}

export function ProductCatalog() {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <Section variant="transparent" padding={6}>
      <VStack gap={8} align="stretch">
        <ProductCategory
          title={t("products.categories.understand")}
          products={tab1Products}
          tk={tk}
        />
        <ProductCategory title={t("products.categories.debug")} products={tab3Products} tk={tk} />
        <ProductCategory
          title={t("products.categories.ship")}
          products={[...tab4FeatureDev, ...tab4Automation, ...tab4Feedback]}
          tk={tk}
        />
      </VStack>
    </Section>
  );
}

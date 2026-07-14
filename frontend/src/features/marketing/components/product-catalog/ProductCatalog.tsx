import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  tab1Products,
  tab3Products,
  tab4Automation,
  tab4FeatureDev,
  tab4Feedback,
} from "@/features/marketing/data/products";
import { staggerContainer, staggerItem } from "./constants";
import { ProductCard } from "./ProductCard";

interface ProductCategoryProps {
  title: string;
  products: typeof tab1Products;
  tk: (key: string) => string;
}

function ProductCategory({ title, products, tk }: ProductCategoryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
    >
      <VStack gap={4} align="stretch">
        <Heading level={3}>{title}</Heading>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Grid columns={{ minWidth: 260, max: 3 }} gap={1}>
            {products.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProductCard product={p} tk={tk} />
              </motion.div>
            ))}
          </Grid>
        </motion.div>
      </VStack>
    </motion.div>
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

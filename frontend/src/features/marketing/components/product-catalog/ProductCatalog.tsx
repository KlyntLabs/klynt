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
      className="mt-8 first:mt-0"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
    >
      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">{title}</h3>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {products.map((p) => (
          <motion.div key={p.id} variants={staggerItem}>
            <ProductCard product={p} tk={tk} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export function ProductCatalog() {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <section className="px-6 sm:px-8 py-6 pb-8">
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
    </section>
  );
}

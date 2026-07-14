import { BarChart3 } from "lucide-react";
import { PRODUCT_ICON_SIZE, type ProductIconConfig, productIconMap } from "./constants";
import styles from "./product-icon.module.css";

interface ProductIconProps {
  name: string;
}

const FALLBACK_ICON: ProductIconConfig = {
  icon: <BarChart3 size={PRODUCT_ICON_SIZE} />,
  hue: "gray",
};

export function ProductIcon({ name }: ProductIconProps) {
  const config = productIconMap[name] || FALLBACK_ICON;

  return <div className={`${styles.tile} ${styles[config.hue]}`}>{config.icon}</div>;
}

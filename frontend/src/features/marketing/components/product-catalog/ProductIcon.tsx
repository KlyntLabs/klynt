import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { BarChart3 } from "lucide-react";
import { type ProductIconConfig, productIconMap } from "./constants";
import styles from "./product-icon.module.css";

interface ProductIconProps {
  name: string;
}

const FALLBACK_ICON: ProductIconConfig = { icon: BarChart3, hue: "gray" };

export function ProductIcon({ name }: ProductIconProps) {
  const { icon, hue } = productIconMap[name] || FALLBACK_ICON;

  /*
   * The tile is an HStack — it centres the mark with props, not CSS. What stays in the CSS
   * module is only what Astryx has no prop for: the tinted surface (one class per hue) and the
   * tile's own geometry, both drawn from tokens.
   *
   * The Icon takes no colour prop on purpose: it defaults to `color="inherit"`, so it picks up
   * the hue class's `--color-text-<hue>` ink, which is the token Astryx pairs with the matching
   * `--color-background-<hue>` surface. (Icon's own `color="blue"` would resolve to
   * `--color-icon-blue` — a different token, tuned for an untinted background.)
   */
  return (
    <HStack align="center" justify="center" className={`${styles.tile} ${styles[hue]}`}>
      <Icon icon={icon} size="sm" />
    </HStack>
  );
}

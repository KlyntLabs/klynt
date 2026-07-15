import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import type { SVGProps } from "react";
import styles from "./brand-logo.module.css";

/*
 * The Klynt wordmark, declared as an icon *component* so it can go through Astryx's <Icon>.
 *
 * Astryx's Icon doc says "Don't render raw SVG elements; always wrap in Icon", and its `icon`
 * prop takes `IconType = ComponentType<SVGProps<SVGSVGElement>>` — "For any icon not in this
 * list, pass an SVG component directly". A brand mark has no lucide equivalent, so it is
 * declared here in exactly the shape lucide's own icons take and handed to Icon, which owns
 * the sizing (`size="lg"` = 24px, the mark's previous width/height). No width/height, no
 * class and no size of its own: the viewBox does the scaling.
 *
 * The fills stay token-driven — the accent tracks the brand colour and the glyph uses the
 * on-accent token so the mark stays legible in both colour modes.
 */
function KlyntMark(props: SVGProps<SVGSVGElement>) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: an icon *component*, the same shape every lucide icon has — bare svg, no title, a11y attributes spread in by the consumer. The accessible name (role="img" + aria-label) is applied where the mark is used, on the <Icon> in BrandLogo.
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="32" height="32" rx="7" fill="var(--color-accent)" />
      <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="var(--color-on-accent)" />
      <circle cx="22" cy="12" r="2" fill="var(--color-on-accent)" />
    </svg>
  );
}

export function BrandLogo({ label, alt }: { label: string; alt: string }) {
  return (
    <HStack className={styles.brand} gap={2} align="center" paddingInline={2} paddingBlock={1}>
      {/*
       * aria-hidden={false} is deliberate: Icon marks every glyph aria-hidden by default
       * (icons are decorative), but this one carries the product's accessible name, so the
       * name has to survive. Icon spreads consumer props last, so this wins.
       */}
      <Icon icon={KlyntMark} size="lg" role="img" aria-label={alt} aria-hidden={false} />
      <Text type="label" weight="semibold">
        {label}
      </Text>
    </HStack>
  );
}

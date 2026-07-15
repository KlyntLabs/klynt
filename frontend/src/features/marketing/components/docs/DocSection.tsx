import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { tween } from "@/core/motion/astryx-motion";
import { spacingPx } from "@/core/theme/astryx-tokens";
import type { DocCategory, DocItem } from "@/features/marketing/data/docs";
import styles from "./docs-section.module.css";

export type DocTranslate = (key: string) => string;

/*
 * framer-motion drives the Astryx components directly (the Window.tsx pattern): the collapse is a
 * VStack, the stagger container *is* the Grid, and each stagger item *is* the card. No <div>.
 */
const MotionVStack = motion.create(VStack);
const MotionGrid = motion.create(Grid);
const MotionClickableCard = motion.create(ClickableCard);

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/*
 * The card's 100px floor, expressed on the one Astryx prop that can carry it.
 *
 * ClickableCard exposes width/height/maxWidth but — unlike Card, Stack, Grid and Section — no
 * `minHeight`, so the floor cannot sit on the card itself. It sits on the card's content stack
 * instead: Stack *does* have `minHeight`, and content + the card's own padding={4} (16px, top and
 * bottom) reproduces the same 100px outer floor the old `.card { min-height: 100px }` set.
 */
const DOC_CARD_PADDING_PX = spacingPx(4);
const DOC_CARD_MIN_HEIGHT = 100;
const DOC_CARD_CONTENT_MIN_HEIGHT = DOC_CARD_MIN_HEIGHT - 2 * DOC_CARD_PADDING_PX;

function DocCard({ item, tk }: { item: DocItem; tk: DocTranslate }) {
  const label = tk(item.labelKey);

  return (
    <MotionClickableCard
      label={label}
      padding={4}
      height="100%"
      variants={staggerItem}
      transition={tween("fast")}
    >
      <VStack
        gap={2}
        align="center"
        justify="center"
        height="100%"
        minHeight={DOC_CARD_CONTENT_MIN_HEIGHT}
      >
        {/*
         * The glyph is an Icon at `md` — 20px, exactly what the old `.cardIcon svg` rule forced
         * in CSS. Astryx's Icon docs forbid that rule twice over: "Don't resize icons with
         * arbitrary pixel values; use the provided size props" and "Don't render raw SVG
         * elements; always wrap in Icon". Only the round plate behind it stays in CSS.
         */}
        <HStack align="center" justify="center" className={styles.cardIcon}>
          <Icon icon={item.icon} size="md" />
        </HStack>
        <Text type="label" weight="medium" justify="center" display="block">
          {label}
        </Text>
      </VStack>
    </MotionClickableCard>
  );
}

export function DocSection({
  category,
  defaultOpen = false,
  tk,
}: {
  category: DocCategory;
  defaultOpen?: boolean;
  tk: DocTranslate;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    /*
     * Astryx's Collapsible owns the trigger button, its aria-expanded and the chevron, but it
     * only *hides* its content — it never unmounts it. The cards are mounted conditionally so
     * a collapsed section leaves nothing behind in the DOM, which is what the hand-rolled
     * accordion did (and what its tests assert).
     */
    <Collapsible
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      className={styles.section}
      trigger={
        <Text type="label" weight="semibold">
          {tk(category.nameKey)}
        </Text>
      }
    >
      <AnimatePresence initial={false}>
        {isOpen && (
          <MotionVStack
            className={styles.collapse}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={tween("medium-min")}
          >
            <MotionGrid
              columns={{ minWidth: 150 }}
              gap={3}
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {category.items.map((item) => (
                <DocCard key={item.labelKey} item={item} tk={tk} />
              ))}
            </MotionGrid>
          </MotionVStack>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}

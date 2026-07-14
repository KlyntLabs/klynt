import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { DocCategory, DocItem } from "@/features/marketing/data/docs";
import styles from "./docs-section.module.css";

export type DocTranslate = (key: string) => string;

function DocCard({ item, tk }: { item: DocItem; tk: DocTranslate }) {
  const ItemIcon = item.icon;
  const label = tk(item.labelKey);

  return (
    <ClickableCard label={label} padding={4} height="100%" className={styles.card}>
      <VStack gap={2} align="center" justify="center" className={styles.cardBody}>
        <span className={styles.cardIcon}>
          <ItemIcon />
        </span>
        <Text type="label" weight="medium" justify="center" display="block">
          {label}
        </Text>
      </VStack>
    </ClickableCard>
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
            }}
            className={styles.collapse}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04 } },
              }}
            >
              <Grid columns={{ minWidth: 150 }} gap={3}>
                {category.items.map((item) => (
                  <motion.div
                    key={item.labelKey}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <DocCard item={item} tk={tk} />
                  </motion.div>
                ))}
              </Grid>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}

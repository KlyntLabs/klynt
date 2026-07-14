import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { StackItem } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MediaTheme } from "@astryxdesign/core/theme";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { DocSection } from "@/features/marketing/components/docs/DocSection";
import { DocsSidebar } from "@/features/marketing/components/docs/DocsSidebar";
import { allDocCategories } from "@/features/marketing/data/docs";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./docs-page.module.css";

/** framer-motion drives the Astryx stacks directly — no raw motion.div. See Window.tsx. */
const MotionVStack = motion.create(VStack);

/**
 * Banner height and search-rail cap. Both sit above Astryx's 48px spacing scale, which has no
 * dimension token; its size props take plain pixel numbers (`SizeValue`: "numbers are treated as
 * pixels"), so they ride props instead of the stylesheet.
 */
const BANNER_HEIGHT = 200;
const SEARCH_ROW_MAX_WIDTH = 720;

export default function DocsPage() {
  const { t } = useMarketingTranslation();
  const tk = (key: string) => t(key as never);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <VStack width="100%">
      <MotionVStack
        width="100%"
        height={BANNER_HEIGHT}
        align="center"
        justify="center"
        className={styles.banner}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          src="/hedgehog-garden.webp"
          alt={t("docs.hero.bannerAlt")}
          width={1024}
          height={1536}
          loading="lazy"
          decoding="async"
          className={styles.bannerImage}
        />

        <VStack className={styles.bannerTitle}>
          <MediaTheme mode="dark">
            <Heading level={1} type="display-2">
              {t("docs.hero.title")}
            </Heading>
          </MediaTheme>
        </VStack>
      </MotionVStack>

      <MotionVStack
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Section variant="transparent" paddingBlock={5} padding={6}>
          {/* The Ask-AI affordance used to float inside the input. Astryx's TextInput owns its
              own trailing slot (clear button, status icon), so the action sits beside the field
              instead — same accessible name, same behaviour. `startIcon` takes the icon
              *component*: TextInput's own renderIconSlot wraps it in Icon. */}
          <HStack gap={2} align="center" maxWidth={SEARCH_ROW_MAX_WIDTH}>
            <TextInput
              label={t("docs.search.placeholder")}
              isLabelHidden
              size="lg"
              startIcon={Search}
              placeholder={t("docs.search.placeholder")}
              value={searchQuery}
              onChange={setSearchQuery}
              className={styles.searchInput}
            />
            <Button
              variant="secondary"
              label={t("docs.search.askAi")}
              endContent={<Icon icon={Sparkles} color="accent" />}
            />
          </HStack>
        </Section>
      </MotionVStack>

      {/*
       * The sidebar used to be `display: none` below a 1024px media query. It is always present
       * now: the doc column is a `StackItem size="fill"` and the rail is a fixed-width stack, so
       * the split is expressed entirely in Astryx props and the breakpoint — the last raw px in
       * docs-page.module.css — is gone. The rail is visible at every width now.
       */}
      <HStack gap={6} paddingInline={6} className={styles.content}>
        <StackItem size="fill">
          {allDocCategories.map((category, i) => (
            <DocSection key={category.nameKey} category={category} defaultOpen={i === 0} tk={tk} />
          ))}
        </StackItem>

        <DocsSidebar />
      </HStack>
    </VStack>
  );
}

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MediaTheme } from "@astryxdesign/core/theme";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { DocSection } from "@/features/marketing/components/docs/DocSection";
import { DocsSidebar } from "@/features/marketing/components/docs/DocsSidebar";
import { allDocCategories } from "@/features/marketing/data/docs";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./docs-page.module.css";

export default function DocsPage() {
  const { t } = useMarketingTranslation();
  const tk = (key: string) => t(key as never);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className={styles.banner}
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

        <div className={styles.bannerTitle}>
          <MediaTheme mode="dark">
            <Heading level={1} type="display-2">
              {t("docs.hero.title")}
            </Heading>
          </MediaTheme>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Section variant="transparent" paddingBlock={5} padding={6}>
          {/* The Ask-AI affordance used to float inside the input. Astryx's TextInput owns its
              own trailing slot (clear button, status icon), so the action sits beside the field
              instead — same accessible name, same behaviour. */}
          <HStack gap={2} align="center" className={styles.searchRow}>
            <TextInput
              label={t("docs.search.placeholder")}
              isLabelHidden
              size="lg"
              startIcon={<Search />}
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
      </motion.div>

      <div className={styles.content}>
        <div className={styles.categories}>
          {allDocCategories.map((category, i) => (
            <DocSection key={category.nameKey} category={category} defaultOpen={i === 0} tk={tk} />
          ))}
        </div>

        <div className={styles.sidebarSlot}>
          <DocsSidebar />
        </div>
      </div>
    </div>
  );
}

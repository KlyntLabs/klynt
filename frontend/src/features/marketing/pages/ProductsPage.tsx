import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ExternalLink, Link as LinkIcon, Play, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  DataPlatformSection,
  InstallCard,
  ProductCatalog,
} from "@/features/marketing/components/product-catalog";
import styles from "./products-page.module.css";

/** An icon + label pair used as the content of a Link. Link has no icon slot of its own. */
function LinkContent({
  icon,
  label,
  iconPlacement = "start",
}: {
  icon: ReactNode;
  label: string;
  iconPlacement?: "start" | "end";
}) {
  return (
    <HStack as="span" gap={1} align="center">
      {iconPlacement === "start" && icon}
      {label}
      {iconPlacement === "end" && icon}
    </HStack>
  );
}

/** The `•` / `|` separators between the inline link rows. */
function Separator({ children }: { children: string }) {
  return (
    <Text color="disabled" aria-hidden="true">
      {children}
    </Text>
  );
}

export default function ProductsPage() {
  const { t } = useTranslation("marketing");

  return (
    <VStack gap={0} width="100%">
      {/* ── Hero ── */}
      <Section variant="transparent" dividers={["bottom"]} padding={6}>
        <div className={styles.heroColumns}>
          <motion.div
            className={styles.heroText}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
          >
            <VStack gap={5} align="stretch">
              <VStack gap={4} align="start">
                <Heading level={1} type="display-3" textWrap="balance">
                  {t("products.hero.title")}
                </Heading>
                <Text type="large" color="secondary" display="block">
                  {t("products.hero.body")}
                </Text>
              </VStack>

              <InstallCard />

              <HStack gap={3} align="center" wrap="wrap">
                <Link href="/docs/model-context-protocol">
                  <LinkContent icon={<LinkIcon size={16} />} label={t("products.hero.links.mcp")} />
                </Link>
                <Separator>&bull;</Separator>
                <Link>
                  <LinkContent icon={<Play size={16} />} label={t("products.hero.links.demo")} />
                </Link>
                <Separator>&bull;</Separator>
                <Link href="/talk-to-a-human">
                  <LinkContent
                    icon={<Users size={16} />}
                    label={t("products.hero.links.talkToHuman")}
                  />
                </Link>
              </HStack>
            </VStack>
          </motion.div>

          <motion.div
            className={styles.heroMedia}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <img
              src="/product-os-hero.webp"
              alt={t("products.hero.mascotAlt")}
              width={1024}
              height={1024}
              fetchPriority="high"
              className={styles.heroImage}
            />
          </motion.div>
        </div>
      </Section>

      <DataPlatformSection />

      {/* ── Automatic Tooling ── */}
      <Section variant="transparent" dividers={["bottom"]} padding={6}>
        <VStack gap={3} align="stretch">
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>{t("products.automaticTooling.title")}</Heading>
            <HStack gap={2} align="center">
              <Link>
                <LinkContent
                  icon={<ExternalLink size={14} />}
                  iconPlacement="end"
                  label={t("products.automaticTooling.readme")}
                />
              </Link>
              <Separator>|</Separator>
              <Link>
                <LinkContent
                  icon={<ExternalLink size={14} />}
                  iconPlacement="end"
                  label={t("products.automaticTooling.llmInstructions")}
                />
              </Link>
            </HStack>
          </HStack>
          <Text color="secondary" display="block">
            {t("products.automaticTooling.bodyBefore")}
            <Link href="/docs/model-context-protocol" type="inherit">
              {t("products.automaticTooling.mcp")}
            </Link>
            {t("products.automaticTooling.bodyAfter")}
          </Text>
        </VStack>
      </Section>

      <ProductCatalog />
    </VStack>
  );
}

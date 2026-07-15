import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ExternalLink, Link as LinkIcon, Play, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { tween } from "@/core/motion/astryx-motion";
import {
  DataPlatformSection,
  InstallCard,
  ProductCatalog,
} from "@/features/marketing/components/product-catalog";
import styles from "./products-page.module.css";

/** framer-motion drives the Astryx components directly — no raw motion.div. See Window.tsx. */
const MotionVStack = motion.create(VStack);
const MotionHStack = motion.create(HStack);

/**
 * The hero mascot's cap. Above Astryx's 48px spacing scale, so it rides a `SizeValue` prop
 * ("numbers are treated as pixels") rather than the stylesheet.
 */
const HERO_IMAGE_MAX_WIDTH = 280;

/**
 * The narrowest a hero column may get before the two collapse into one. Astryx's Grid reflows on
 * the container, so this replaces the 640px media query outright — no breakpoint, no CSS.
 */
const HERO_COLUMN_MIN_WIDTH = 320;

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
        {/* Two columns when there is room, one when there is not — Grid reflows on the container,
            so the hero carries no breakpoint. */}
        <Grid columns={{ minWidth: HERO_COLUMN_MIN_WIDTH, max: 2 }} gap={6}>
          <MotionVStack
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tween("medium")}
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
                  <LinkContent
                    icon={<Icon icon={LinkIcon} size="sm" />}
                    label={t("products.hero.links.mcp")}
                  />
                </Link>
                <Separator>&bull;</Separator>
                <Link>
                  <LinkContent
                    icon={<Icon icon={Play} size="sm" />}
                    label={t("products.hero.links.demo")}
                  />
                </Link>
                <Separator>&bull;</Separator>
                <Link href="/talk-to-a-human">
                  <LinkContent
                    icon={<Icon icon={Users} size="sm" />}
                    label={t("products.hero.links.talkToHuman")}
                  />
                </Link>
              </HStack>
            </VStack>
          </MotionVStack>

          {/* The stack fills its grid track and centres the mascot; the mascot's own cap rides a
              `maxWidth` prop on the stack that holds it. */}
          <MotionHStack
            align="center"
            justify="center"
            width="100%"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={tween("medium", { delay: 0.15 })}
          >
            <VStack width="100%" maxWidth={HERO_IMAGE_MAX_WIDTH}>
              <img
                src="/product-os-hero.webp"
                alt={t("products.hero.mascotAlt")}
                width={1024}
                height={1024}
                fetchPriority="high"
                className={styles.heroImage}
              />
            </VStack>
          </MotionHStack>
        </Grid>
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
                  icon={<Icon icon={ExternalLink} size="xsm" />}
                  iconPlacement="end"
                  label={t("products.automaticTooling.readme")}
                />
              </Link>
              <Separator>|</Separator>
              <Link>
                <LinkContent
                  icon={<Icon icon={ExternalLink} size="xsm" />}
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

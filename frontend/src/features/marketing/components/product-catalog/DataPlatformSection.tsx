import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon, type IconType } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { BarChart3, Code2, Database, ExternalLink, FileText, Webhook } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import { staggerContainer, staggerItem } from "./constants";
import styles from "./data-platform-section.module.css";

/*
 * The muted square that carries a card's leading mark. It is an HStack — the centring is props,
 * not CSS — and the mark inside it is an Icon at `sm` (16px, the size the old `w-4 h-4` set).
 * Only the tile's surface and geometry stay in CSS, both from tokens.
 */
function IconTile({ icon }: { icon: IconType }) {
  return (
    <HStack align="center" justify="center" className={styles.iconTile}>
      <Icon icon={icon} size="sm" />
    </HStack>
  );
}

interface DataIOCardProps {
  icon: IconType;
  title: string;
  items: string[];
  linkText?: string;
}

function DataIOCard({ icon, title, items, linkText }: DataIOCardProps) {
  return (
    <Card padding={4}>
      <Collapsible
        defaultIsOpen={false}
        trigger={
          <HStack gap={3} align="center">
            <IconTile icon={icon} />
            <Text weight="semibold">{title}</Text>
          </HStack>
        }
      >
        <VStack gap={3} align="start" paddingBlock={2}>
          <HStack gap={1.5} wrap="wrap">
            {items.map((item) => (
              <Token key={item} size="sm" label={item} />
            ))}
          </HStack>
          {linkText && (
            <Button
              variant="ghost"
              size="sm"
              label={linkText}
              endContent={<Icon icon={ExternalLink} size="xsm" />}
            />
          )}
        </VStack>
      </Collapsible>
    </Card>
  );
}

/*
 * framer-motion drives the Astryx components directly. Every Astryx component keeps `ref`,
 * `style` and `className` (see the Window reference), so `motion.create()` composes with one —
 * which is what lets the stagger run without a single wrapper <div>. The Grid *is* the stagger
 * container and each Card *is* a stagger item.
 */
const MotionGrid = motion.create(Grid);
const MotionCard = motion.create(Card);

interface ManageCardProps {
  icon: IconType;
  title: string;
  index: number;
}

function ManageCard({ icon, title, index }: ManageCardProps) {
  return (
    <MotionCard padding={3} height="100%" variants={staggerItem} custom={index}>
      <HStack gap={3} align="center">
        <IconTile icon={icon} />
        <Text weight="medium">{title}</Text>
      </HStack>
    </MotionCard>
  );
}

/** The five "manage" marks, in the order the translated card titles arrive. */
const MANAGE_ICONS: IconType[] = [Code2, Database, Webhook, FileText, BarChart3];

export function DataPlatformSection() {
  const { t, array } = useMarketingTranslation();

  const dataSources = array<string>("data.dataSources");
  const dataExport = array<string>("data.dataExport");
  const manageCards = array<{ title: string }>("products.dataPlatform.manageCards");

  return (
    <Section variant="transparent" padding={6} dividers={["bottom"]}>
      <VStack gap={5} align="stretch">
        <VStack gap={3} align="stretch">
          <HStack gap={3} align="center" justify="between">
            <Heading level={2}>{t("products.dataPlatform.title")}</Heading>
            <Button
              variant="ghost"
              size="sm"
              label={t("products.dataPlatform.readme")}
              endContent={<Icon icon={ExternalLink} size="xsm" />}
            />
          </HStack>
          <Text color="secondary" display="block">
            {t("products.dataPlatform.body")}
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 280, max: 2 }} gap={3}>
          <DataIOCard
            icon={Database}
            title={t("products.dataPlatform.sourcesCard.title")}
            items={dataSources}
            linkText={t("products.dataPlatform.sourcesCard.link")}
          />
          <DataIOCard
            icon={Webhook}
            title={t("products.dataPlatform.exportCard.title")}
            items={dataExport}
            linkText={t("products.dataPlatform.exportCard.link")}
          />
        </Grid>

        <VStack gap={3} align="stretch">
          <Heading level={3}>{t("products.dataPlatform.manageTitle")}</Heading>
          <MotionGrid
            columns={{ minWidth: 160, max: 5 }}
            gap={3}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {MANAGE_ICONS.map((icon, i) => {
              const title = manageCards[i]?.title ?? "";
              return <ManageCard key={title || i} icon={icon} title={title} index={i} />;
            })}
          </MotionGrid>
        </VStack>
      </VStack>
    </Section>
  );
}

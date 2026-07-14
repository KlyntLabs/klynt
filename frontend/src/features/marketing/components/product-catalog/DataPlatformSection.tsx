import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { BarChart3, Code2, Database, ExternalLink, FileText, Webhook } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import { staggerContainer, staggerItem } from "./constants";
import styles from "./data-platform-section.module.css";

/** Icon geometry in px, replacing the `w-4 h-4` utility class. */
const CARD_ICON_SIZE = 16;

interface DataIOCardProps {
  icon: React.ReactNode;
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
            <div className={styles.iconTile}>{icon}</div>
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

interface ManageCardProps {
  icon: React.ReactNode;
  title: string;
}

function ManageCard({ icon, title }: ManageCardProps) {
  return (
    <Card padding={3} height="100%">
      <HStack gap={3} align="center">
        <div className={styles.iconTile}>{icon}</div>
        <Text weight="medium">{title}</Text>
      </HStack>
    </Card>
  );
}

export function DataPlatformSection() {
  const { t, array } = useMarketingTranslation();

  const dataSources = array<string>("data.dataSources");
  const dataExport = array<string>("data.dataExport");
  const manageCards = array<{ title: string }>("products.dataPlatform.manageCards");

  const manageIcons = [
    <Code2 key="code" size={CARD_ICON_SIZE} />,
    <Database key="database" size={CARD_ICON_SIZE} />,
    <Webhook key="webhook" size={CARD_ICON_SIZE} />,
    <FileText key="file" size={CARD_ICON_SIZE} />,
    <BarChart3 key="chart" size={CARD_ICON_SIZE} />,
  ];

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
            icon={<Database size={CARD_ICON_SIZE} />}
            title={t("products.dataPlatform.sourcesCard.title")}
            items={dataSources}
            linkText={t("products.dataPlatform.sourcesCard.link")}
          />
          <DataIOCard
            icon={<Webhook size={CARD_ICON_SIZE} />}
            title={t("products.dataPlatform.exportCard.title")}
            items={dataExport}
            linkText={t("products.dataPlatform.exportCard.link")}
          />
        </Grid>

        <VStack gap={3} align="stretch">
          <Heading level={3}>{t("products.dataPlatform.manageTitle")}</Heading>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Grid columns={{ minWidth: 160, max: 5 }} gap={3}>
              {manageIcons.map((icon, i) => {
                const title = manageCards[i]?.title ?? "";
                return (
                  <motion.div key={title || i} variants={staggerItem} custom={i}>
                    <ManageCard icon={icon} title={title} />
                  </motion.div>
                );
              })}
            </Grid>
          </motion.div>
        </VStack>
      </VStack>
    </Section>
  );
}

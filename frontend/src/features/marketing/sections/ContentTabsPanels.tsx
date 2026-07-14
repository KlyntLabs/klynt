import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FileText, Flag, Globe, Plug, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProductItem } from "@/features/marketing/data/homeData";
import {
  tab1Products,
  tab3Products,
  tab4Automation,
  tab4FeatureDev,
  tab4Feedback,
} from "@/features/marketing/data/homeData";
import { getMarketingIcon } from "@/features/marketing/lib/icon-map";
import styles from "./content-tabs-section.module.css";

interface PanelProps {
  onOpenApp: (route: string, title?: string) => void;
}

/** Panel heading + supporting copy, the shape every tab shares. */
function PanelIntro({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <VStack gap={2} align="start">
      <Heading level={2}>{title}</Heading>
      {body}
    </VStack>
  );
}

export function TabUnderstandPanel({ onOpenApp }: PanelProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <div className={styles.columns}>
      <div className={styles.textColumn}>
        <VStack gap={3} align="start">
          <PanelIntro
            title={t("home.tabUnderstand.title")}
            body={
              <Text type="supporting" display="block">
                {t("home.tabUnderstand.body")}
              </Text>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            label={t("home.tabUnderstand.link")}
            onClick={() => onOpenApp("/products", t("home.tabUnderstand.title"))}
          />
        </VStack>
      </div>

      <Grid columns={3} gap={2}>
        {tab1Products.map((product) => (
          <ClickableCard
            key={product.id}
            variant="transparent"
            padding={3}
            label={tk(product.labelKey)}
            onClick={() => onOpenApp(product.route, tk(product.labelKey))}
          >
            <VStack gap={1.5} align="center">
              {getMarketingIcon(product.icon, <Globe size={28} />)}
              <Text type="supporting" size="xsm" weight="medium" justify="center">
                {tk(product.labelKey)}
              </Text>
            </VStack>
          </ClickableCard>
        ))}
      </Grid>
    </div>
  );
}

function DataGroup({
  title,
  tags,
  linkLabel,
  onClick,
}: {
  title: string;
  tags: string[];
  linkLabel: string;
  onClick?: () => void;
}) {
  return (
    <VStack gap={2} align="start">
      <Heading level={3}>{title}</Heading>
      <HStack gap={1} wrap="wrap">
        {tags.map((tag) => (
          <Badge key={tag} variant="neutral" label={tag} />
        ))}
      </HStack>
      <Button variant="ghost" size="sm" label={linkLabel} onClick={onClick} />
    </VStack>
  );
}

export function TabDataPanel({ onOpenApp }: PanelProps) {
  const { t } = useTranslation("marketing");

  const dataSources = t("data.dataSources", { returnObjects: true }) as unknown as string[];
  const dataManageQuery = t("data.dataManageQuery", { returnObjects: true }) as unknown as string[];
  const dataExport = t("data.dataExport", { returnObjects: true }) as unknown as string[];

  return (
    <VStack gap={4} align="start">
      <PanelIntro
        title={t("home.tabData.title")}
        body={
          <Text type="supporting" display="block">
            {t("home.tabData.body")}
          </Text>
        }
      />

      <Grid columns={{ minWidth: 200, max: 3 }} gap={4} width="100%">
        <DataGroup
          title={t("home.tabData.sourcesTitle")}
          tags={dataSources}
          linkLabel={t("home.tabData.sourcesLink")}
          onClick={() => onOpenApp("/products", t("home.tabData.sourcesTitle"))}
        />
        <DataGroup
          title={t("home.tabData.manageTitle")}
          tags={dataManageQuery}
          linkLabel={t("home.tabData.manageLink")}
        />
        <DataGroup
          title={t("home.tabData.exportTitle")}
          tags={dataExport}
          linkLabel={t("home.tabData.exportLink")}
        />
      </Grid>
    </VStack>
  );
}

export function TabDebugPanel({ onOpenApp }: PanelProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <VStack gap={4} align="start">
      <PanelIntro
        title={t("home.tabDebug.title")}
        body={
          <Text type="supporting" display="block">
            {t("home.tabDebug.body")}
          </Text>
        }
      />

      <Grid columns={{ minWidth: 240, max: 2 }} gap={3} width="100%">
        {tab3Products.map((product) => (
          <ClickableCard
            key={product.id}
            padding={4}
            label={tk(product.labelKey)}
            onClick={() => onOpenApp(product.route, tk(product.labelKey))}
          >
            <VStack gap={2} align="start">
              {getMarketingIcon(product.icon, <FileText size={32} />)}
              <Text type="label" weight="semibold">
                {tk(product.labelKey)}
              </Text>
              <Text type="supporting" size="xsm" display="block">
                {product.descriptionKey ? tk(product.descriptionKey) : ""}
              </Text>
            </VStack>
          </ClickableCard>
        ))}
      </Grid>
    </VStack>
  );
}

interface TabShipGroupProps {
  title: string;
  items: ProductItem[];
  onOpenApp: (route: string, title?: string) => void;
  fallbackIcon: React.ReactNode;
}

function TabShipGroup({ title, items, onOpenApp, fallbackIcon }: TabShipGroupProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <VStack gap={2} align="start">
      <Text
        type="supporting"
        size="xsm"
        weight="semibold"
        color="disabled"
        className={styles.eyebrow}
      >
        {title}
      </Text>
      <VStack gap={1} align="stretch" width="100%">
        {items.map((item) => (
          <ClickableCard
            key={item.id}
            variant="transparent"
            padding={2}
            label={tk(item.labelKey)}
            onClick={() => onOpenApp(item.route, tk(item.labelKey))}
          >
            <HStack gap={3} align="center">
              {getMarketingIcon(item.icon, fallbackIcon)}
              <Text type="label" weight="medium">
                {tk(item.labelKey)}
              </Text>
            </HStack>
          </ClickableCard>
        ))}
      </VStack>
    </VStack>
  );
}

export function TabShipPanel({ onOpenApp }: PanelProps) {
  const { t } = useTranslation("marketing");

  return (
    <VStack gap={4} align="start">
      <PanelIntro
        title={t("home.tabShip.title")}
        body={
          <>
            <Text type="supporting" display="block">
              {t("home.tabShip.body1")}
            </Text>
            <Text type="supporting" display="block">
              {t("home.tabShip.body2")}
            </Text>
          </>
        }
      />

      <VStack gap={4} align="start" width="100%">
        <TabShipGroup
          title={t("home.tabShip.featureDev")}
          items={tab4FeatureDev}
          onOpenApp={onOpenApp}
          fallbackIcon={<Flag size={20} />}
        />
        <TabShipGroup
          title={t("home.tabShip.automation")}
          items={tab4Automation}
          onOpenApp={onOpenApp}
          fallbackIcon={<Plug size={20} />}
        />
        <TabShipGroup
          title={t("home.tabShip.feedback")}
          items={tab4Feedback}
          onOpenApp={onOpenApp}
          fallbackIcon={<Users size={20} />}
        />
      </VStack>
    </VStack>
  );
}

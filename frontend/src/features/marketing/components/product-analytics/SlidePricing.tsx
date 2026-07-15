import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

export function SlidePricing() {
  const { t } = useTranslation("marketing");

  return (
    <VStack height="100%" paddingInline={8} gap={6} align="center" justify="center">
      <Heading level={2} justify="center">
        {t("productAnalytics.slides.pricing.title")}
      </Heading>

      <Card padding={8} width={320}>
        <VStack gap={3} align="center">
          <Text type="large" weight="semibold" display="block" justify="center">
            {t("productAnalytics.slides.pricing.product")}
          </Text>

          <VStack gap={1} align="center">
            {/* Astryx's Text colour union has no "green", so the token sits on the element via a
                class and Text opts into it with color="inherit". The wrapper <div> is gone. */}
            <Text
              type="display-3"
              color="inherit"
              weight="bold"
              display="block"
              className={styles.priceFigure}
            >
              {t("productAnalytics.slides.pricing.freeTier")}
            </Text>
            <Badge variant="green" label={t("productAnalytics.slides.pricing.freeLabel")} />
          </VStack>

          <Divider />

          <VStack gap={1} align="center">
            <Text color="secondary" display="block" justify="center">
              {t("productAnalytics.slides.pricing.rate")}
            </Text>
            <Text type="supporting" size="xsm" color="disabled" display="block" justify="center">
              {t("productAnalytics.slides.pricing.noHiddenFees")}
            </Text>
          </VStack>
        </VStack>
      </Card>

      <Button variant="primary" label={t("productAnalytics.slides.pricing.cta")} />
    </VStack>
  );
}

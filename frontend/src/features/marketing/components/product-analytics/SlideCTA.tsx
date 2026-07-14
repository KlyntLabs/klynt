import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Copy } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

export function SlideCTA() {
  const { t } = useTranslation("marketing");
  const installCommand = t("productAnalytics.slides.cta.installCommand");

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(installCommand);
  }, [installCommand]);

  return (
    <div className={styles.ctaSlide}>
      <VStack gap={8} align="center">
        <VStack gap={3} align="center">
          <Heading level={2} type="display-3" justify="center" textWrap="balance">
            {t("productAnalytics.slides.cta.title")}
          </Heading>
          <Text color="secondary" display="block" justify="center">
            {t("productAnalytics.slides.cta.subtitle")}
          </Text>
        </VStack>

        <VStack gap={6} align="center">
          <HStack gap={3} justify="center">
            <Button variant="primary" label={t("productAnalytics.slides.cta.primary")} />
            <Button variant="secondary" label={t("productAnalytics.slides.cta.secondary")} />
          </HStack>

          <div className={styles.commandBar}>
            <Text type="code">{installCommand}</Text>
            <IconButton
              variant="ghost"
              size="sm"
              label={t("productAnalytics.slides.cta.copyTooltip")}
              icon={<Copy />}
              onClick={handleCopy}
            />
          </div>
        </VStack>
      </VStack>
    </div>
  );
}

import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

/** The brand plate. Past the spacing scale's 48px ceiling, so it rides the stack's size props. */
const BRAND_PLATE_SIZE = 64;

export function SlideTitle() {
  const { t } = useTranslation("marketing");

  return (
    <VStack height="100%" paddingInline={8} gap={6} align="center" justify="center">
      <HStack
        align="center"
        justify="center"
        width={BRAND_PLATE_SIZE}
        height={BRAND_PLATE_SIZE}
        className={styles.brandPlate}
      >
        <Icon icon={BarChart3} size="lg" />
      </HStack>

      <VStack gap={3} align="center">
        <Heading level={1} type="display-3" justify="center" textWrap="balance">
          {t("productAnalytics.slides.title.title")}
        </Heading>
        <VStack gap={2} align="center">
          <Text type="large" color="secondary" display="block" justify="center">
            {t("productAnalytics.slides.title.subtitle")}
          </Text>
          <Text color="disabled" display="block" justify="center">
            {t("productAnalytics.slides.title.tagline")}
          </Text>
        </VStack>
      </VStack>

      {/* Static hint — the ambient pulse loop is gone; Astryx's motion model doesn't express it. */}
      <Text type="supporting" display="block" justify="center">
        {t("productAnalytics.slides.title.hint")}
      </Text>
    </VStack>
  );
}

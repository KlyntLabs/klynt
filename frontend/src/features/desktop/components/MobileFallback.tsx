import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import styles from "./mobile-fallback.module.css";

/** The reading measure for the message. Passed as a prop — `SizeValue` strings are used as-is. */
const PANEL_MAX_WIDTH = "28rem";

export function MobileFallback() {
  const { t } = useTranslation("home");
  return (
    // Astryx's Center is exactly this: "Use it for empty states, loading screens, ... or any
    // content that should sit in the center of the available space", with the height set so it
    // knows what space to centre within. The panel div is gone — the VStack carries the measure.
    <Center className={styles.screen} width="100vw" height="100vh">
      <VStack gap={4} align="center" maxWidth={PANEL_MAX_WIDTH}>
        <Heading level={1} justify="center">
          {t("desktop.mobileFallback.title")}
        </Heading>
        <Text as="p" display="block" color="secondary" justify="center">
          {t("desktop.mobileFallback.message")}
        </Text>
      </VStack>
    </Center>
  );
}

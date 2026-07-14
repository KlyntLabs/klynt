import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./community-header.module.css";

function getTodayDate(language: string): string {
  const d = new Date();
  return d.toLocaleDateString(language === "cn" ? "zh-CN" : language === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CommunityHeader() {
  const { t, language } = useMarketingTranslation();

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={styles.header}
    >
      <div className={styles.row}>
        <Text color="secondary">{getTodayDate(language)}</Text>

        <div className={styles.masthead}>
          <Heading level={1} justify="center">
            {t("community.header.title")}
          </Heading>
        </div>

        <div className={styles.operational}>
          <HStack gap={1} align="center">
            <Icon icon={CheckCircle2} color="success" size="xsm" />
            <Text type="supporting" color="inherit">
              {t("community.header.operational")}
            </Text>
          </HStack>
        </div>
      </div>

      <Text type="supporting" display="block" justify="center">
        <em>{t("community.header.tagline")}</em>
      </Text>
    </motion.header>
  );
}

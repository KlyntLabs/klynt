import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./cookie-banner.module.css";

const COOKIE_DISMISSED_KEY = "cookie-dismissed";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

function isCookieDismissed(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(COOKIE_DISMISSED_KEY) === "true";
}

function dismissCookie(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(COOKIE_DISMISSED_KEY, "true");
}

export default function CookieBanner() {
  const [dismissed, setDismissed] = useState(isCookieDismissed);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation("home");

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissCookie();
      setDismissed(true);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && !dismissed && (
        // The motion.div only pins the banner to the corner and animates it in; the surface
        // itself — border, radius, elevation, padding — is an Astryx Card.
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className={styles.banner}
        >
          <Card padding={4}>
            <VStack gap={2} align="start">
              <Heading level={3} className={styles.heading}>
                {t("desktop.cookieBanner.heading")}
              </Heading>

              <Text color="secondary" display="block">
                {t("desktop.cookieBanner.body")}
              </Text>

              <Text color="secondary" display="block">
                <em>{t("desktop.cookieBanner.aside")}</em>
              </Text>

              <HStack gap={3} align="center">
                <img
                  src="/ursula-cookie.webp"
                  alt={t("desktop.cookieBanner.ursulaAlt")}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className={styles.mascot}
                />
                <Text type="supporting" size="sm">
                  {t("desktop.cookieBanner.footer")}
                </Text>
              </HStack>
            </VStack>
          </Card>

          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.cookieBanner.dismiss")}
            icon={<X />}
            onClick={handleDismiss}
            className={styles.dismiss}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

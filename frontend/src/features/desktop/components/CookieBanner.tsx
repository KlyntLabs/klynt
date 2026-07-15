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
import { tween } from "@/core/motion/astryx-motion";
import styles from "./cookie-banner.module.css";

/*
 * The banner *is* the Card — an Astryx surface that framer-motion animates, exactly as the
 * window frame is in Window.tsx. Every Astryx component extends BaseProps, which keeps `ref`,
 * `style`, `className` and event handlers, so `motion.create()` drives one directly; the old
 * motion.div wrapper around the Card was a raw div doing nothing the Card could not do itself.
 */
const MotionCard = motion.create(Card);

/** The banner's measure. Past the spacing scale, so it rides on Card's `width` (SizeValue:
 *  "numbers are treated as pixels") rather than sitting in CSS. */
const BANNER_WIDTH = 380;

/** The mascot's on-screen square. Same reasoning — a wrapper prop, not a CSS px. */
const MASCOT_SIZE = 64;

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
        <MotionCard
          padding={4}
          width={BANNER_WIDTH}
          className={styles.banner}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={tween("medium-min")}
        >
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
              <VStack className={styles.mascot} width={MASCOT_SIZE} height={MASCOT_SIZE}>
                <img
                  src="/ursula-cookie.webp"
                  alt={t("desktop.cookieBanner.ursulaAlt")}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className={styles.mascotImage}
                />
              </VStack>
              <Text type="supporting" size="sm">
                {t("desktop.cookieBanner.footer")}
              </Text>
            </HStack>
          </VStack>

          <IconButton
            variant="ghost"
            size="sm"
            label={t("desktop.cookieBanner.dismiss")}
            icon={<X />}
            onClick={handleDismiss}
            className={styles.dismiss}
          />
        </MotionCard>
      )}
    </AnimatePresence>
  );
}

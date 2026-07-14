import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { Check, Copy, Link as LinkIcon, Play, User } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { TypewriterText } from "@/features/marketing/components/TypewriterText";
import styles from "./hero-section.module.css";

interface HeroSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

export function HeroSection({ onOpenApp }: HeroSectionProps) {
  const { t } = useTranslation("marketing");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(t("home.hero.installCommand")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [t]);

  return (
    <Section variant="transparent" padding={0}>
      <div className={styles.columns}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className={styles.textColumn}
        >
          <VStack gap={5} align="start">
            <HStack gap={2} align="center">
              {/*
               * The wordmark is a brand asset, not a themed surface: its geometry and the
               * accent are fixed. The accent is drawn from the theme so it tracks the brand
               * colour, and the plate uses the inverted background token so the mark stays
               * legible in both colour modes.
               */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={t("home.hero.logoAlt")}
              >
                <title>{t("home.hero.logoAlt")}</title>
                <rect width="32" height="32" rx="6" fill="var(--color-background-inverted)" />
                <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="var(--color-accent)" />
                <circle cx="22" cy="12" r="2" fill="var(--color-accent)" />
              </svg>
              <Text type="large" weight="bold">
                {t("home.hero.brand")}
              </Text>
            </HStack>

            <VStack gap={3} align="start">
              <Heading level={1} type="display-2" textWrap="balance">
                {t("home.hero.title")}
              </Heading>

              <VStack gap={1} align="start">
                <Text color="secondary" display="block">
                  {t("home.hero.subtitle1")}
                </Text>
                <Text color="secondary" display="block">
                  {t("home.hero.subtitle2")}
                  <Text color="primary" as="span">
                    <em>
                      <TypewriterText text={t("home.hero.subtitle2Emphasis")} speed={80} />
                    </em>
                  </Text>
                  .
                </Text>
              </VStack>
            </VStack>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <HStack gap={3} wrap="wrap">
                <Button
                  variant="primary"
                  label={t("home.hero.ctaPrimary")}
                  onClick={() => onOpenApp("/pricing", t("home.hero.ctaPrimary"))}
                />
                <Button variant="secondary" label={t("home.hero.ctaSecondary")} />
              </HStack>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <VStack gap={1.5} align="start">
                <div className={styles.commandBar}>
                  <Text type="code" display="block" className={styles.command}>
                    {t("home.hero.installCommand")}
                  </Text>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label={t("home.hero.copyTooltip")}
                    icon={copied ? <Check /> : <Copy />}
                    onClick={handleCopy}
                  />
                </div>
                <Text type="supporting" size="2xs">
                  {t("home.hero.installHint")}
                </Text>
              </VStack>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <HStack gap={1} align="center" wrap="wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<LinkIcon />}
                  label={t("home.hero.links.mcp")}
                  onClick={() => onOpenApp("/docs", t("home.hero.links.mcp"))}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Play />}
                  label={t("home.hero.links.demo")}
                  onClick={() => onOpenApp("/demo", t("home.hero.links.demo"))}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<User />}
                  label={t("home.hero.links.talkToHuman")}
                  onClick={() => onOpenApp("/talk-to-a-human", t("home.hero.links.talkToHuman"))}
                />
              </HStack>
            </motion.div>
          </VStack>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={styles.mascotColumn}
        >
          <img
            src="/hedgehog-hero.webp"
            alt={t("home.hero.mascotAlt")}
            width={1024}
            height={1024}
            fetchPriority="high"
            className={styles.mascot}
          />
        </motion.div>
      </div>
    </Section>
  );
}

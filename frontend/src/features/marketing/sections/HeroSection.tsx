import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Section } from "@astryxdesign/core/Section";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { Check, Copy, Link as LinkIcon, Play, User } from "lucide-react";
import type { SVGProps } from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { tween } from "@/core/motion/astryx-motion";
import { TypewriterText } from "@/features/marketing/components/TypewriterText";
import styles from "./hero-section.module.css";

/*
 * framer-motion drives Astryx components directly. Every Astryx component extends BaseProps,
 * which deliberately keeps `ref`, `style`, `className` and event handlers, so `motion.create()`
 * can animate one without a wrapper. Composing them is the native path; a raw `motion.div` is
 * not — see the same note in features/desktop/components/Window.tsx.
 */
const MotionVStack = motion.create(VStack);
const MotionHStack = motion.create(HStack);

/**
 * Mascot render width. Astryx's spacing scale stops at 48px and has no dimension token; its size
 * props take plain pixel numbers (`SizeValue`: "numbers are treated as pixels"), so anything
 * above the scale rides a prop rather than the stylesheet.
 */
const MASCOT_WIDTH = 260;

/**
 * The narrowest a hero column may get before the two columns collapse into one. This is Astryx's
 * container-driven responsive API — `Grid columns={{minWidth, max}}` reflows on the space actually
 * available, so the hero needs no breakpoint at all. (A media condition cannot hold a var(), which
 * is why the 768px literal this replaces could never be tokenised.)
 */
const HERO_COLUMN_MIN_WIDTH = 340;

/**
 * The brand wordmark, authored as an `IconType` (`ComponentType<SVGProps<SVGSVGElement>>`) so it
 * can be handed to Astryx's `Icon` rather than rendered as a raw `<svg>` — "Don't render raw SVG
 * elements; always wrap in Icon" (`bunx astryx component Icon`). Icon owns the geometry; this
 * component owns only the path data and the token fills, so the mark tracks the theme.
 */
function KlyntWordmark({ "aria-label": label, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
      {...props}
    >
      <title>{label}</title>
      <rect width="32" height="32" rx="6" fill="var(--color-accent)" />
      <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="var(--color-on-accent)" />
      <circle cx="22" cy="12" r="2" fill="var(--color-on-accent)" />
    </svg>
  );
}

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
      {/* Two columns when there is room for two, one when there is not — Grid decides from the
          container, so the hero carries no breakpoint and no CSS. */}
      <Grid columns={{ minWidth: HERO_COLUMN_MIN_WIDTH, max: 2 }} gap={6}>
        <MotionVStack
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tween("medium")}
        >
          <VStack gap={5} align="start">
            <HStack gap={2} align="center">
              <Icon
                icon={KlyntWordmark}
                size="lg"
                aria-hidden={false}
                aria-label={t("home.hero.logoAlt")}
              />
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

            <MotionHStack
              gap={3}
              wrap="wrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={tween("medium", { delay: 0.1 })}
            >
              <Button
                variant="primary"
                label={t("home.hero.ctaPrimary")}
                onClick={() => onOpenApp("/pricing", t("home.hero.ctaPrimary"))}
              />
              <Button variant="secondary" label={t("home.hero.ctaSecondary")} />
            </MotionHStack>

            <MotionVStack
              gap={1.5}
              align="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={tween("medium", { delay: 0.2 })}
            >
              {/* The command bar is a *surface* — border, radius, muted background — which is
                  exactly what Card is. Padding and gap ride the inner HStack's spacing props. */}
              <Card variant="muted" padding={0}>
                <HStack gap={2} align="center" paddingBlock={2} paddingInline={4}>
                  <StackItem size="fill" isScrollable>
                    <Text type="code" display="block">
                      {t("home.hero.installCommand")}
                    </Text>
                  </StackItem>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label={t("home.hero.copyTooltip")}
                    icon={copied ? <Icon icon={Check} /> : <Icon icon={Copy} />}
                    onClick={handleCopy}
                  />
                </HStack>
              </Card>
              <Text type="supporting" size="2xs">
                {t("home.hero.installHint")}
              </Text>
            </MotionVStack>

            <MotionHStack
              gap={1}
              align="center"
              wrap="wrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={tween("medium", { delay: 0.3 })}
            >
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon icon={LinkIcon} />}
                label={t("home.hero.links.mcp")}
                onClick={() => onOpenApp("/docs", t("home.hero.links.mcp"))}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon icon={Play} />}
                label={t("home.hero.links.demo")}
                onClick={() => onOpenApp("/demo", t("home.hero.links.demo"))}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon icon={User} />}
                label={t("home.hero.links.talkToHuman")}
                onClick={() => onOpenApp("/talk-to-a-human", t("home.hero.links.talkToHuman"))}
              />
            </MotionHStack>
          </VStack>
        </MotionVStack>

        {/* The mascot's cap rides a `width` prop on its own stack; the stack that holds it fills
            the grid track and centres it. No CSS width, no breakpoint. */}
        <MotionHStack
          align="center"
          justify="center"
          width="100%"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={tween("medium-max", { delay: 0.2 })}
        >
          <VStack width={MASCOT_WIDTH}>
            <img
              src="/hedgehog-hero.webp"
              alt={t("home.hero.mascotAlt")}
              width={1024}
              height={1024}
              fetchPriority="high"
              className={styles.mascot}
            />
          </VStack>
        </MotionHStack>
      </Grid>
    </Section>
  );
}

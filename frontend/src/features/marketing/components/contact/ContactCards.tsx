import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch, Mail, MessageCircle } from "lucide-react";
import { tween } from "@/core/motion/astryx-motion";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./contact-cards.module.css";

/*
 * framer-motion drives the Astryx components directly (the Window.tsx pattern): the Grid *is*
 * the stagger container and each Card *is* a stagger item, so no wrapper <div> is left.
 */
const MotionGrid = motion.create(Grid);
const MotionCard = motion.create(Card);

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween("medium-min"),
  },
};

interface ContactCardDef {
  key: string;
  icon: React.ReactNode;
  /** CSS-module class for the tinted icon disc — one per channel. */
  iconDisc: string;
  href: string;
  external: boolean;
}

export function ContactCards() {
  const { t } = useMarketingTranslation();

  const cards: ContactCardDef[] = [
    {
      key: "discord",
      icon: <Icon icon={MessageCircle} />,
      iconDisc: styles.iconDiscDiscord,
      href: "https://discord.gg/klynt",
      external: true,
    },
    {
      key: "email",
      icon: <Icon icon={Mail} />,
      iconDisc: styles.iconDiscEmail,
      href: "mailto:hey@klynt.com",
      external: false,
    },
    {
      key: "github",
      icon: <Icon icon={GitBranch} />,
      iconDisc: styles.iconDiscGithub,
      href: "https://github.com/Klynt/klynt-edu/issues",
      external: true,
    },
  ];

  return (
    <MotionGrid
      columns={3}
      gap={4}
      className={styles.region}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {cards.map((card) => (
        <MotionCard key={card.key} padding={5} height="100%" variants={staggerItem}>
          <VStack gap={3} align="start" height="100%">
            {/* The disc centres its Icon with HStack props; only its tint stays in CSS. */}
            <HStack align="center" justify="center" className={card.iconDisc}>
              {card.icon}
            </HStack>
            {/*
             * level={4} is the visual scale (the card title is card-sized, not
             * section-sized); accessibilityLevel={2} keeps the document outline the page
             * had before the migration.
             */}
            <Heading level={4} accessibilityLevel={2}>
              {t(`talkToHuman.contactCards.${card.key}.title` as never)}
            </Heading>
            <Text type="supporting" display="block" className={styles.body}>
              {t(`talkToHuman.contactCards.${card.key}.body` as never)}
            </Text>
            <Link href={card.href} target={card.external ? "_blank" : undefined}>
              {t(`talkToHuman.contactCards.${card.key}.link` as never)}{" "}
              <Icon icon={ArrowRight} size="xsm" />
            </Link>
          </VStack>
        </MotionCard>
      ))}
    </MotionGrid>
  );
}

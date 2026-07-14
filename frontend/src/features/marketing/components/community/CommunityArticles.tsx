import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { Fragment } from "react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./community-articles.module.css";
import type { CommunityArticle, CommunityStat, CommunityStats } from "./community-types";

/* framer-motion drives the Astryx stacks directly; `as` keeps the <section>/<article> semantics. */
const MotionVStack = motion.create(VStack);

/*
 * The list thumbnail's rendered box. It is a plain <img> — Astryx ships no image primitive — so
 * the size rides the element's own width/height attributes rather than sitting as raw px in the
 * stylesheet. As HTML attributes they also give the browser the correct aspect ratio up front,
 * which is what prevents layout shift.
 */
const THUMBNAIL_WIDTH = 80;
const THUMBNAIL_HEIGHT = 60;

const columnVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export function CommunityArticles() {
  const { t, array, object } = useMarketingTranslation();
  const articles = array<CommunityArticle>("community.articles.items");
  const stats = object<CommunityStats>("community.stats");

  const [featured, ...rest] = articles;
  const statItems: CommunityStat[] = [stats.slackMembers, stats.messagesSent, stats.countries];

  return (
    /* The column's width is its Grid track (see CommunityPage) — it used to be a CSS `width: 50%`
       behind a 1024px media query, which is exactly what Grid's container-driven columns replace. */
    <MotionVStack
      as="section"
      gap={6}
      variants={columnVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
    >
      <MotionVStack
        as="article"
        gap={4}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AspectRatio ratio={16 / 10} className={styles.featuredMedia}>
          <img
            src="/hedgehog-hero.webp"
            alt={t("community.header.title")}
            width={1024}
            height={1024}
            className={styles.featuredImage}
          />
        </AspectRatio>
        <VStack gap={1}>
          {/* text-transform/letter-spacing sit on the Text itself — both inherit, so the wrapper
              <div> the eyebrow used to need is gone. */}
          <Text type="supporting" size="xsm" display="block" className={styles.eyebrow}>
            {featured?.category}
          </Text>
          <Heading level={2}>{featured?.title}</Heading>
          <Text type="supporting" display="block" maxLines={3}>
            {featured?.excerpt}
          </Text>
        </VStack>
      </MotionVStack>

      <Divider />

      <List hasDividers>
        {rest.map((article) => (
          <ListItem
            key={article.title}
            startContent={
              <img
                src="/product-os-hero.webp"
                alt=""
                width={THUMBNAIL_WIDTH}
                height={THUMBNAIL_HEIGHT}
                loading="lazy"
                decoding="async"
                className={styles.thumbnail}
              />
            }
            label={
              <VStack gap={0.5}>
                <Text type="supporting" size="xsm" display="block" className={styles.eyebrow}>
                  {article.category}
                </Text>
                <Heading level={3}>{article.title}</Heading>
              </VStack>
            }
            description={
              <Text type="supporting" display="block" maxLines={2}>
                {article.excerpt}
              </Text>
            }
          />
        ))}
      </List>

      <Section variant="muted" padding={4}>
        <HStack justify="around">
          {statItems.map((stat, index) => (
            <Fragment key={stat.label}>
              {index > 0 && <Divider orientation="vertical" />}
              <VStack gap={0.5} align="center">
                <Text type="large" weight="bold">
                  {stat.value}
                </Text>
                <Text type="supporting" size="2xs">
                  {stat.label}
                </Text>
              </VStack>
            </Fragment>
          ))}
        </HStack>
      </Section>
    </MotionVStack>
  );
}

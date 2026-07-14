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
    <motion.section
      variants={columnVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className={styles.column}
    >
      <VStack gap={6}>
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <VStack gap={4}>
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
              <div className={styles.eyebrow}>
                <Text type="supporting" size="xsm" display="block">
                  {featured?.category}
                </Text>
              </div>
              <Heading level={2}>{featured?.title}</Heading>
              <Text type="supporting" display="block" maxLines={3}>
                {featured?.excerpt}
              </Text>
            </VStack>
          </VStack>
        </motion.article>

        <Divider />

        <List hasDividers>
          {rest.map((article) => (
            <ListItem
              key={article.title}
              startContent={
                <img
                  src="/product-os-hero.webp"
                  alt=""
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className={styles.thumbnail}
                />
              }
              label={
                <VStack gap={0.5}>
                  <div className={styles.eyebrow}>
                    <Text type="supporting" size="xsm" display="block">
                      {article.category}
                    </Text>
                  </div>
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
      </VStack>
    </motion.section>
  );
}

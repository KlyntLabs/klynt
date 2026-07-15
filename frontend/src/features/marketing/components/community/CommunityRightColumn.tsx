import { Badge } from "@astryxdesign/core/Badge";
import { Blockquote } from "@astryxdesign/core/Blockquote";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, MessageCircle, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { tween } from "@/core/motion/astryx-motion";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import type {
  CommunityChangelogItem,
  CommunityFeatureRequest,
  CommunityQuestion,
} from "./community-types";

/* framer-motion drives the Astryx stack directly; `as="aside"` keeps the landmark. */
const MotionVStack = motion.create(VStack);

const columnVariants = {
  hidden: { opacity: 0, x: 15 },
  visible: { opacity: 1, x: 0 },
};

export function CommunityRightColumn() {
  const { t, array } = useMarketingTranslation();
  const [email, setEmail] = useState("");

  const questions = array<CommunityQuestion>("community.questions.items");
  const changelogItems = array<CommunityChangelogItem>("community.changelog.items");
  const featureRequests = array<CommunityFeatureRequest>("community.featureRequests.items");

  return (
    /* The column's width is its Grid track (see CommunityPage) — it used to be a CSS `width: 25%`
       behind a 1024px media query, which is exactly what Grid's container-driven columns replace. */
    <MotionVStack
      as="aside"
      gap={6}
      variants={columnVariants}
      initial="hidden"
      animate="visible"
      transition={tween("medium")}
    >
      <Card variant="muted">
        <VStack gap={3}>
          <VStack gap={0.5}>
            <Heading level={2}>{t("community.newsletter.title")}</Heading>
            <Text type="supporting" color="accent" weight="medium" display="block">
              {t("community.newsletter.subtitle")}
            </Text>
            <Text type="supporting" display="block">
              {t("community.newsletter.body")}
            </Text>
          </VStack>
          <VStack gap={2}>
            <TextInput
              label={t("community.newsletter.title")}
              isLabelHidden
              type="email"
              placeholder={t("community.newsletter.placeholder")}
              value={email}
              onChange={setEmail}
            />
            <Button variant="primary" label={t("community.newsletter.cta")} />
          </VStack>
        </VStack>
      </Card>

      <Card>
        <VStack gap={2}>
          <HStack gap={2} align="center">
            <Icon icon={MessageCircle} color="accent" size="sm" />
            <Heading level={2}>{t("community.slackJoin.title")}</Heading>
          </HStack>
          <Text type="supporting" display="block">
            {t("community.slackJoin.body")}
          </Text>
          <Button variant="primary" label={t("community.slackJoin.cta")} />
        </VStack>
      </Card>

      <List
        hasDividers
        density="compact"
        header={
          <HStack justify="between" align="center">
            <Heading level={2}>{t("community.questions.title")}</Heading>
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon icon={ArrowRight} size="sm" />}
              label={t("community.questions.viewAll")}
            />
          </HStack>
        }
      >
        {questions.map((question) => (
          <ListItem
            key={question.topic}
            label={question.topic}
            description={t("community.questions.reply", { time: question.reply })}
          />
        ))}
      </List>

      <VStack gap={2}>
        <List
          listStyle="disc"
          density="compact"
          header={
            <VStack gap={1}>
              <Heading level={2}>{t("community.changelog.title")}</Heading>
              <Text type="supporting" display="block">
                {t("community.changelog.body")}
              </Text>
            </VStack>
          }
        >
          {changelogItems.map((item) => (
            <ListItem key={item.text} label={item.text} description={item.category} />
          ))}
        </List>
        <HStack>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon icon={ArrowRight} size="sm" />}
            label={t("community.changelog.viewAll")}
          />
        </HStack>
      </VStack>

      <VStack gap={2}>
        <List
          hasDividers
          density="compact"
          header={<Heading level={2}>{t("community.featureRequests.title")}</Heading>}
        >
          {featureRequests.map((request) => (
            <ListItem
              key={request.name}
              label={request.name}
              endContent={
                <Badge
                  variant="neutral"
                  icon={<Icon icon={ThumbsUp} size="xsm" />}
                  label={String(request.votes)}
                />
              }
            />
          ))}
        </List>
        <HStack>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon icon={ArrowRight} size="sm" />}
            label={t("community.featureRequests.voteCta")}
          />
        </HStack>
      </VStack>

      <VStack gap={2}>
        <Heading level={2}>{t("community.ceoMusings.title")}</Heading>
        <Blockquote>&ldquo;{t("community.ceoMusings.quote")}&rdquo;</Blockquote>
        <HStack>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon icon={ExternalLink} size="sm" />}
            label={t("community.ceoMusings.cta")}
          />
        </HStack>
      </VStack>
    </MotionVStack>
  );
}

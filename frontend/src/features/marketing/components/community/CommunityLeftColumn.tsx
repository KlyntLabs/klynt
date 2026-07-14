import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Blockquote } from "@astryxdesign/core/Blockquote";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import type { CommunityEvent, CommunitySlackThread, CommunitySpotlight } from "./community-types";

/* framer-motion drives the Astryx stack directly; `as="aside"` keeps the landmark. */
const MotionVStack = motion.create(VStack);

const columnVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0 },
};

export function CommunityLeftColumn() {
  const { t, array, object } = useMarketingTranslation();
  const slackThreads = array<CommunitySlackThread>("community.slack.threads");
  const spotlight = object<CommunitySpotlight>("community.spotlight");
  const events = array<CommunityEvent>("community.events.items");

  return (
    /* The column's width is its Grid track (see CommunityPage) — it used to be a CSS `width: 25%`
       behind a 1024px media query, which is exactly what Grid's container-driven columns replace. */
    <MotionVStack
      as="aside"
      gap={6}
      variants={columnVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
    >
      <Card variant="muted">
        <VStack gap={2}>
          <Text type="supporting" display="block">
            {t("community.editor.welcome")}
          </Text>
          <Text type="supporting" color="disabled" display="block">
            <em>{t("community.editor.signature")}</em>
          </Text>
        </VStack>
      </Card>

      <Divider />

      <Blockquote cite={t("community.wisdom.attribution")}>
        &ldquo;{t("community.wisdom.quote")}&rdquo;
      </Blockquote>

      <List hasDividers header={<Heading level={2}>{t("community.slack.title")}</Heading>}>
        {slackThreads.map((thread) => (
          <ListItem
            key={thread.title}
            label={thread.title}
            description={
              <Text type="supporting" display="block" maxLines={2}>
                {thread.preview}
              </Text>
            }
            endContent={<Badge variant="neutral" label={thread.channel} />}
          />
        ))}
      </List>

      <Card variant="muted">
        <VStack gap={2}>
          <HStack gap={3} align="center">
            <Avatar name={spotlight.name} size="large" />
            <VStack gap={0.5}>
              <Text weight="semibold" display="block">
                {spotlight.name}
              </Text>
              <Text type="supporting" display="block">
                {spotlight.role}
              </Text>
            </VStack>
          </HStack>
          <Text type="supporting" display="block">
            {spotlight.bio}
          </Text>
          <HStack>
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon icon={ArrowRight} size="sm" />}
              label={t("community.spotlight.cta", { name: spotlight.name })}
            />
          </HStack>
        </VStack>
      </Card>

      <List hasDividers header={<Heading level={2}>{t("community.events.title")}</Heading>}>
        {events.map((event) => (
          <ListItem
            key={event.title}
            startContent={<Icon icon={Calendar} color="accent" size="sm" />}
            label={event.title}
            description={
              <HStack gap={2} align="center">
                <Text type="supporting">{event.date}</Text>
                <Badge variant="neutral" label={event.type} />
              </HStack>
            }
          />
        ))}
      </List>
    </MotionVStack>
  );
}

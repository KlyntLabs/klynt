import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon, type IconType } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Sparkles, Users } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./docs-sidebar.module.css";

/*
 * The rail is a VStack that framer-motion drives directly — `as="aside"` keeps the landmark the
 * hand-rolled <motion.aside> had. Its width is a prop, not CSS: Astryx's SizeValue is explicit
 * that "numbers are treated as pixels", and the spacing scale stops at 48px so no token reaches
 * 260. (See Window.tsx for the same motion.create()-over-Astryx composition.)
 */
const MotionVStack = motion.create(VStack);

/** The rail's fixed width. Off the spacing scale, so it rides an Astryx size prop. */
const SIDEBAR_WIDTH = 260;

function SidebarRow({ icon, title, body }: { icon: IconType; title: string; body: string }) {
  return (
    <HStack gap={2} align="start">
      {/*
       * The mark is an Icon: `size="sm"` is the 16px the old `.rowIcon svg { width: 16px }` rule
       * forced, and `color="disabled"` is the same `--color-icon-disabled` token the wrapper span
       * set. Astryx's Icon docs forbid both moves — "Don't resize icons with arbitrary pixel
       * values; use the provided size props" and "Don't render raw SVG elements; always wrap in
       * Icon" — so the span and the svg selector are gone.
       */}
      <HStack className={styles.rowIcon}>
        <Icon icon={icon} size="sm" color="disabled" />
      </HStack>
      <VStack gap={0.5} align="start">
        <Text type="label" size="2xs" weight="medium" display="block">
          {title}
        </Text>
        <Text type="supporting" size="2xs" display="block">
          {body}
        </Text>
      </VStack>
    </HStack>
  );
}

export function DocsSidebar() {
  const { t } = useMarketingTranslation();

  return (
    <MotionVStack
      as="aside"
      width={SIDEBAR_WIDTH}
      className={styles.sidebar}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card padding={5}>
        <VStack gap={4} align="stretch">
          <Heading level={2}>{t("docs.sidebar.title")}</Heading>

          <VStack gap={3} align="stretch">
            <SidebarRow
              icon={ExternalLink}
              title={t("docs.sidebar.website.title")}
              body={t("docs.sidebar.website.body")}
            />
            <SidebarRow
              icon={BookOpen}
              title={t("docs.sidebar.product.title")}
              body={t("docs.sidebar.product.body")}
            />
            <SidebarRow
              icon={Sparkles}
              title={t("docs.sidebar.ai.title")}
              body={t("docs.sidebar.ai.body")}
            />
            <SidebarRow
              icon={Users}
              title={t("docs.sidebar.community.title")}
              body={t("docs.sidebar.community.body")}
            />
          </VStack>

          <Divider />

          <VStack gap={1.5} align="start">
            <Text type="supporting" size="2xs" display="block">
              {t("docs.sidebar.feedback1")}
            </Text>
            <Text type="supporting" size="2xs" display="block">
              {t("docs.sidebar.feedback2")}
            </Text>
            <Text type="supporting" size="2xs" display="block">
              {t("docs.sidebar.feedback3")}
            </Text>
            {/* The feedback affordance never navigated — it was an <a>-looking <button>.
                Astryx's guidance is explicit: a non-navigating action is a Button. */}
            <Button variant="ghost" size="sm" label={t("docs.sidebar.feedbackLink")} />
          </VStack>
        </VStack>
      </Card>
    </MotionVStack>
  );
}

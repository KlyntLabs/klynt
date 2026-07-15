import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy } from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import { tween } from "@/core/motion/astryx-motion";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./install-card.module.css";

/* The disclosure animates its height open, so framer-motion drives an Astryx stack directly. */
const MotionVStack = motion.create(VStack);

/** The frameworks named inline in the "supports …" sentence. Not translated: they are proper nouns. */
const HIGHLIGHTED_FRAMEWORKS = ["Next.js", "React", "Python"];

export function InstallCard() {
  const { t, array } = useMarketingTranslation();
  const [copied, setCopied] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);

  const command = t("products.hero.installCommand");
  const frameworks = array<string>("products.hero.frameworks");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <Card padding={4}>
      <VStack gap={3} align="stretch">
        <HStack gap={2} align="center">
          <Button
            variant="secondary"
            size="sm"
            label={t("products.hero.getStarted")}
            endContent={<Icon icon={ChevronDown} size="sm" />}
          />
        </HStack>

        <HStack gap={2} align="center">
          <Text type="code" display="block" className={styles.command}>
            {command}
          </Text>
          {/* `color="green"` resolves to the very same --color-icon-green the `.copied` class
              set by hand, so the success signal is now a prop and the class is gone. */}
          <IconButton
            variant="secondary"
            label={t("products.hero.copyTooltip")}
            icon={
              copied ? (
                <Icon icon={Check} size="sm" color="green" />
              ) : (
                <Icon icon={Copy} size="sm" />
              )
            }
            onClick={handleCopy}
          />
        </HStack>

        {/* `as="div"`: the disclosure below is a block element, which may not nest in a span. */}
        <Text type="supporting" size="2xs" as="div" display="block">
          {t("products.hero.supports")}{" "}
          {/* A Fragment, not a <span>: the framework names run inline inside the sentence, so
              they need no element of their own — and an Astryx stack would be flex and break the
              text flow. */}
          {HIGHLIGHTED_FRAMEWORKS.map((framework, index) => (
            <Fragment key={framework}>
              <Button variant="ghost" size="sm" label={framework} />
              {index < HIGHLIGHTED_FRAMEWORKS.length - 1 ? ", " : ""}
            </Fragment>
          ))}
          , {t("products.hero.and")}{" "}
          <Button
            variant="ghost"
            size="sm"
            label={t("products.hero.more")}
            onClick={() => setShowFrameworks(!showFrameworks)}
          />
          <AnimatePresence>
            {showFrameworks && (
              <MotionVStack
                className={styles.reveal}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={tween("fast")}
              >
                <HStack gap={1.5} wrap="wrap" paddingBlock={2}>
                  {frameworks.map((fw) => (
                    <Token key={fw} size="sm" label={fw} />
                  ))}
                </HStack>
              </MotionVStack>
            )}
          </AnimatePresence>
        </Text>
      </VStack>
    </Card>
  );
}

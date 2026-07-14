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
import { useCallback, useState } from "react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./install-card.module.css";

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
          <IconButton
            variant="secondary"
            label={t("products.hero.copyTooltip")}
            icon={copied ? <Check className={styles.copied} /> : <Copy />}
            onClick={handleCopy}
          />
        </HStack>

        {/* `as="div"`: the disclosure below is a block element, which may not nest in a span. */}
        <Text type="supporting" size="2xs" as="div" display="block">
          {t("products.hero.supports")}{" "}
          {HIGHLIGHTED_FRAMEWORKS.map((framework, index) => (
            <span key={framework}>
              <Button variant="ghost" size="sm" label={framework} />
              {index < HIGHLIGHTED_FRAMEWORKS.length - 1 ? ", " : ""}
            </span>
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
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={styles.reveal}
              >
                <HStack gap={1.5} wrap="wrap" paddingBlock={2}>
                  {frameworks.map((fw) => (
                    <Token key={fw} size="sm" label={fw} />
                  ))}
                </HStack>
              </motion.div>
            )}
          </AnimatePresence>
        </Text>
      </VStack>
    </Card>
  );
}

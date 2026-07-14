import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon, type IconSize } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Lock,
  Music,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./trash-page.module.css";

/*
 * framer-motion drives the Astryx components directly: the header is a MotionSection, each tile a
 * MotionClickableCard. Every Astryx component extends BaseProps, which keeps `ref`, `style`,
 * `className` and event handlers, so `motion.create()` can animate one without a wrapper div —
 * the same composition Window.tsx uses.
 */
const MotionSection = motion.create(Section);
const MotionClickableCard = motion.create(ClickableCard);

/* ──────────────────────────── types ──────────────────────────── */

interface TrashItem {
  id?: string;
  filename: string;
  type?: "markdown" | "image" | "spreadsheet" | "audio" | "pdf" | "json" | "csv" | "txt";
  size: string;
  dateDeleted: string;
  description: string;
  content: string | string[];
  redacted?: boolean;
  redactedReason?: string;
}

/* ──────────────────────────── helpers ──────────────────────────── */

/**
 * The icon for a file type.
 *
 * Both the geometry and the hue are Astryx `Icon` props: "Don't resize icons with arbitrary pixel
 * values; use the provided size props" and "Use color tokens for icon colors"
 * (`bunx astryx component Icon`). `size` is an `IconSize` (xsm | sm | md | lg), so the one helper
 * serves the grid tiles (`lg`) and the dialog header (`sm`).
 *
 * `IconColor` carries the categorical hues (blue, green, orange, red, …) alongside the semantic
 * ones, and each resolves to the very same `--color-icon-<hue>` token the old CSS module set by
 * hand — so the colour is now a prop and the hue classes are gone, with no shift in appearance.
 */
function getFileIcon(type: TrashItem["type"], size: IconSize = "lg") {
  switch (type) {
    case "image":
      return <Icon icon={ImageIcon} size={size} color="blue" aria-hidden="true" />;
    case "spreadsheet":
    case "csv":
      return <Icon icon={FileSpreadsheet} size={size} color="green" aria-hidden="true" />;
    case "audio":
      return <Icon icon={Music} size={size} color="orange" aria-hidden="true" />;
    case "pdf":
      return <Icon icon={FileText} size={size} color="red" aria-hidden="true" />;
    default:
      return <Icon icon={FileText} size={size} color="secondary" aria-hidden="true" />;
  }
}

/** The icon for a trash item: a lock when the item is redacted, otherwise its file-type icon. */
function getItemIcon(item: TrashItem, size: IconSize = "lg") {
  if (item.redacted) {
    return <Icon icon={Lock} size={size} color="disabled" aria-hidden="true" />;
  }
  return getFileIcon(item.type, size);
}

/* ──────────────────────────── page ──────────────────────────── */

export default function TrashPage() {
  const { t } = useTranslation("marketing");
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);

  const trashItems = t("trash.items", { returnObjects: true }) as TrashItem[];
  const fileTypeLabels = t("trash.fileTypes", { returnObjects: true }) as Record<
    NonNullable<TrashItem["type"]>,
    string
  >;

  return (
    <VStack height="100%">
      {/* Header */}
      <MotionSection
        variant="muted"
        dividers={["bottom"]}
        padding={6}
        paddingBlock={4}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <HStack justify="between" align="center" gap={3} wrap="wrap">
          <HStack gap={2} align="center">
            <Icon icon={Trash2} size="md" color="secondary" aria-hidden="true" />
            <Text type="label" weight="semibold">
              {t("trash.header.title")}
            </Text>
          </HStack>
          <Text type="supporting" size="sm">
            {t("trash.header.subtitle")}
          </Text>
          <Badge
            variant="neutral"
            label={t("trash.header.itemsCount", { count: trashItems.length })}
          />
        </HStack>
      </MotionSection>

      {/* Subtitle */}
      <Section variant="transparent" dividers={["bottom"]} padding={6} paddingBlock={3}>
        <Text type="supporting" size="sm" display="block">
          {t("trash.header.description")}
        </Text>
      </Section>

      {/* Grid */}
      <VStack height="100%" isScrollable padding={6} className={styles.grid}>
        <Grid columns={{ minWidth: 160, max: 4 }} gap={4}>
          {trashItems.map((item, i) => (
            <MotionClickableCard
              key={item.id ?? item.filename}
              label={item.filename}
              onClick={() => setSelectedItem(item)}
              height="100%"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              whileHover={{ scale: 1.02 }}
            >
              <VStack gap={1} align="center">
                {getItemIcon(item)}
                <Text
                  type="label"
                  size="sm"
                  justify="center"
                  maxLines={2}
                  hasTruncateTooltip={false}
                  wordBreak="break-word"
                >
                  {item.filename}
                </Text>
                <Text type="supporting" size="xsm" color="disabled" justify="center">
                  {item.redacted ? t("trash.redacted") : fileTypeLabels[item.type ?? "txt"]}
                </Text>
                <HStack justify="between" width="100%">
                  <Text type="supporting" size="xsm" color="disabled">
                    {item.size}
                  </Text>
                  <Text type="supporting" size="xsm" color="disabled">
                    {item.dateDeleted}
                  </Text>
                </HStack>
                {!item.redacted && (
                  <Text
                    type="supporting"
                    size="xsm"
                    justify="center"
                    maxLines={2}
                    hasTruncateTooltip={false}
                  >
                    {item.description}
                  </Text>
                )}
              </VStack>
            </MotionClickableCard>
          ))}
        </Grid>
      </VStack>

      {/* Detail Modal */}
      <Dialog isOpen={selectedItem !== null} onOpenChange={() => setSelectedItem(null)} width={448}>
        {selectedItem && (
          <>
            <DialogHeader
              title={selectedItem.filename}
              subtitle={
                selectedItem.redacted ? selectedItem.redactedReason : selectedItem.description
              }
              startContent={getItemIcon(selectedItem, "sm")}
              onOpenChange={() => setSelectedItem(null)}
            />

            <VStack isScrollable paddingBlock={4} className={styles.dialogBody}>
              {selectedItem.redacted ? (
                <VStack gap={1} align="center" paddingBlock={6}>
                  <Icon icon={AlertTriangle} size="lg" color="orange" aria-hidden="true" />
                  <Text type="label" weight="medium" justify="center">
                    {t("trash.detail.niceTry")}
                  </Text>
                  <Text type="supporting" size="sm" justify="center">
                    {selectedItem.redactedReason}
                  </Text>
                </VStack>
              ) : (
                <Card variant="muted" padding={4}>
                  <Text type="code" size="sm" display="block" className={styles.preformatted}>
                    {Array.isArray(selectedItem.content)
                      ? selectedItem.content.join("\n")
                      : selectedItem.content}
                  </Text>
                </Card>
              )}
            </VStack>

            <Divider />
            <HStack justify="between" align="center" gap={2} paddingBlock={3}>
              <Text type="supporting" size="xsm" color="disabled">
                {selectedItem.type?.toUpperCase() ?? "UNKNOWN"} &bull; {selectedItem.size} &bull;{" "}
                {t("trash.detail.deleted")} {selectedItem.dateDeleted}
              </Text>
              <Button
                size="sm"
                variant="secondary"
                label={t("trash.detail.restore")}
                tooltip={t("trash.detail.restoreTooltip")}
                isDisabled
                onClick={() => setSelectedItem(null)}
              />
            </HStack>
          </>
        )}
      </Dialog>
    </VStack>
  );
}

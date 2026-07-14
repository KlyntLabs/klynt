import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
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
 * The icon for a file type. `size` is a pixel size so the same helper can serve the 32px grid
 * tiles and the 16px dialog header. Colour comes from Astryx icon tokens via a CSS module class;
 * lucide strokes with currentColor, so setting `color` is enough.
 */
function getFileIcon(type: TrashItem["type"], size = 32) {
  switch (type) {
    case "image":
      return <ImageIcon size={size} className={styles.iconBlue} aria-hidden="true" />;
    case "spreadsheet":
    case "csv":
      return <FileSpreadsheet size={size} className={styles.iconGreen} aria-hidden="true" />;
    case "audio":
      return <Music size={size} className={styles.iconOrange} aria-hidden="true" />;
    case "pdf":
      return <FileText size={size} className={styles.iconRed} aria-hidden="true" />;
    default:
      return <FileText size={size} className={styles.iconNeutral} aria-hidden="true" />;
  }
}

/** The icon for a trash item: a lock when the item is redacted, otherwise its file-type icon. */
function getItemIcon(item: TrashItem, size = 32) {
  if (item.redacted) {
    return <Lock size={size} className={styles.iconDisabled} aria-hidden="true" />;
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Section variant="muted" dividers={["bottom"]} padding={6} paddingBlock={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <HStack gap={2} align="center">
              <Trash2 size={20} className={styles.iconNeutral} aria-hidden="true" />
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
        </Section>
      </motion.div>

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
            <motion.div
              key={item.id ?? item.filename}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              whileHover={{ scale: 1.02 }}
            >
              <ClickableCard
                label={item.filename}
                onClick={() => setSelectedItem(item)}
                height="100%"
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
              </ClickableCard>
            </motion.div>
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
              startContent={getItemIcon(selectedItem, 16)}
              onOpenChange={() => setSelectedItem(null)}
            />

            <VStack isScrollable paddingBlock={4} className={styles.dialogBody}>
              {selectedItem.redacted ? (
                <VStack gap={1} align="center" paddingBlock={6}>
                  <AlertTriangle size={48} className={styles.iconOrange} aria-hidden="true" />
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

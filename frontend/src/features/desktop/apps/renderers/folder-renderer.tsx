import { Center } from "@astryxdesign/core/Center";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";
import styles from "./folder-renderer.module.css";

/**
 * The folder field's track width. Astryx's Grid takes `columns={{minWidth, repeat}}` — "minWidth
 * sets the minimum column width in px, repeat controls track behavior ('fill' preserves empty
 * tracks for consistent widths)" — which is exactly the repeat(auto-fill, minmax(5rem, 1fr))
 * this used to hand-roll. 80px == the old 5rem at the default root size.
 */
const FOLDER_COLUMN_MIN_WIDTH = 80;

type FolderRendererProps = {
  content: Record<string, unknown>;
  items: IconTreeNode[];
  readOnly?: boolean;
  onOpenApp?: (appId: string) => void;
  onOpenFolder?: (appId: string) => void;
};

function getIcon(
  node: IconTreeNode,
  fallbackContent: Record<string, unknown>,
  hasChildren: boolean
): string {
  const nodeIcon = node.icon;
  if (typeof nodeIcon === "string" && nodeIcon.length > 0) {
    return nodeIcon;
  }
  const fallbackIcon = fallbackContent.icon;
  if (typeof fallbackIcon === "string" && fallbackIcon.length > 0) {
    return fallbackIcon;
  }
  return hasChildren ? "📁" : "📄";
}

function getLabel(node: IconTreeNode): string {
  return node.title ?? node.appId;
}

export function FolderRenderer({
  content,
  items,
  readOnly = false,
  onOpenApp,
  onOpenFolder,
}: FolderRendererProps): React.JSX.Element {
  const { t } = useTranslation("app");

  const handleChildClick = (node: IconTreeNode) => {
    if (readOnly) {
      return;
    }

    const hasChildren = (node.children ?? []).length > 0;
    if (hasChildren) {
      onOpenFolder?.(node.appId);
    } else {
      onOpenApp?.(node.appId);
    }
  };

  if (items.length === 0) {
    return (
      <Center className={styles.emptyState} height="100%" data-testid="folder-empty-state">
        <Text type="body" color="secondary">
          {t("folder.empty")}
        </Text>
      </Center>
    );
  }

  return (
    <Grid
      className={styles.grid}
      columns={{ minWidth: FOLDER_COLUMN_MIN_WIDTH, repeat: "fill" }}
      gap={4}
    >
      {items.map((node) => {
        const hasChildren = (node.children ?? []).length > 0;
        const icon = getIcon(node, content, hasChildren);
        const label = getLabel(node);

        return (
          /*
           * A folder item IS an Astryx ClickableCard.
           *
           * It used to be a `<VStack as="button">` carrying a `{type, disabled}` spread-cast —
           * BaseProps extends HTMLAttributes, not ButtonHTMLAttributes, so button-only
           * attributes are untyped even though rest props do reach the element. The cast was a
           * custom pattern papering over "Astryx has no component for this", and that premise
           * was simply wrong: ClickableCard is a click target that takes arbitrary children,
           * and it brings a real <button> (hence the role, the accessible name from `label`,
           * and the focus ring), `isDisabled`, and the hover state — so the cast, the
           * native-button reset and the hand-written :hover/:focus-visible/:disabled rules all
           * go at once.
           */
          <ClickableCard
            key={node.appId}
            label={label}
            isDisabled={readOnly}
            onClick={() => handleChildClick(node)}
            padding={2}
            data-testid={`folder-item-${node.appId}`}
          >
            <VStack gap={2} align="center">
              {/* The glyph is an emoji from user content, not a lucide icon, so Astryx's <Icon>
                  (which takes an SVG *component*) has nothing to wrap. Text renders the inline
                  element instead — `as="span"` + `display="inline"` — and its size comes from
                  the type scale rather than a CSS rule. */}
              <Text as="span" display="inline" size="2xl" aria-hidden="true">
                {icon}
              </Text>
              {/* maxLines={1} is Text's own ellipsis — the .label class that hand-rolled
                  overflow/text-overflow/white-space is gone. */}
              <Text type="supporting" size="sm" maxLines={1}>
                {label}
              </Text>
            </VStack>
          </ClickableCard>
        );
      })}
    </Grid>
  );
}

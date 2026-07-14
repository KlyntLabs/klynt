import { Text } from "@astryxdesign/core/Text";
import { useTranslation } from "react-i18next";
import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";
import styles from "./folder-renderer.module.css";

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
      <div className={styles.emptyState} data-testid="folder-empty-state">
        <Text type="body" color="secondary">
          {t("folder.empty")}
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((node) => {
        const hasChildren = (node.children ?? []).length > 0;
        const icon = getIcon(node, content, hasChildren);
        const label = getLabel(node);

        return (
          <button
            key={node.appId}
            type="button"
            onClick={() => handleChildClick(node)}
            disabled={readOnly}
            className={styles.item}
            data-testid={`folder-item-${node.appId}`}
            aria-label={label}
          >
            {/* The icon is an emoji glyph, not a lucide icon: it comes from user content. */}
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
            <Text type="supporting" size="sm" className={styles.label}>
              {label}
            </Text>
          </button>
        );
      })}
    </div>
  );
}

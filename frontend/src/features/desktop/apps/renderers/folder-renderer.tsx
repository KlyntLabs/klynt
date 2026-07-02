import { useTranslation } from "react-i18next";
import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";

type FolderRendererProps = {
  content: Record<string, unknown>;
  children?: IconTreeNode[];
  items?: IconTreeNode[];
  readOnly?: boolean;
  onOpenApp?: (appId: string) => void;
  onOpenFolder?: (appId: string) => void;
};

function getIcon(content: Record<string, unknown>, hasChildren: boolean): string {
  const icon = content.icon;
  if (typeof icon === "string" && icon.length > 0) {
    return icon;
  }
  return hasChildren ? "📁" : "📄";
}

function getLabel(node: IconTreeNode): string {
  return node.title ?? node.appId;
}

export function FolderRenderer({
  content,
  children = [],
  items,
  readOnly = false,
  onOpenApp,
  onOpenFolder,
}: FolderRendererProps): React.JSX.Element {
  const { t } = useTranslation("app");
  const childNodes = items ?? children;

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

  if (childNodes.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground"
        data-testid="folder-empty-state"
      >
        {t("folder.empty")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-4 p-4">
      {childNodes.map((node) => {
        const hasChildren = (node.children ?? []).length > 0;
        const icon = getIcon(content, hasChildren);
        const label = getLabel(node);

        return (
          <button
            key={node.appId}
            type="button"
            onClick={() => handleChildClick(node)}
            disabled={readOnly}
            className="flex flex-col items-center gap-2 rounded-md p-2 text-center transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50"
            data-testid={`folder-item-${node.appId}`}
            aria-label={label}
          >
            <span className="text-2xl" aria-hidden="true">
              {icon}
            </span>
            <span className="max-w-full truncate text-xs text-foreground">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

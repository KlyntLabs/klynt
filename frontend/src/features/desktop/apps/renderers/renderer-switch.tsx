import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";
import { FolderRenderer } from "./folder-renderer";
import { MarkdownRenderer } from "./markdown-renderer";
import { NotesRenderer } from "./notes-renderer";
import { VideoRenderer } from "./video-renderer";

type RendererSwitchProps = {
  rendererId: string;
  content: Record<string, unknown>;
  readOnly?: boolean;
  onChange?: (content: Record<string, unknown>) => void;
};

export const KNOWN_RENDERER_IDS = new Set(["markdown", "notes", "video", "folder"]);

const noop = () => {};

function getFolderChildren(content: Record<string, unknown>): IconTreeNode[] | undefined {
  const children = content.children;
  if (Array.isArray(children)) {
    return children as IconTreeNode[];
  }
  return undefined;
}

export function RendererSwitch({
  rendererId,
  content,
  readOnly = false,
  onChange,
}: RendererSwitchProps): React.JSX.Element | null {
  switch (rendererId) {
    case "markdown":
      return <MarkdownRenderer content={content} readOnly={readOnly} onChange={onChange} />;
    case "notes":
      return <NotesRenderer content={content} readOnly={readOnly} onChange={onChange} />;
    case "video":
      return <VideoRenderer content={content} readOnly={readOnly} onChange={onChange} />;
    case "folder":
      return (
        <FolderRenderer
          content={content}
          items={getFolderChildren(content) ?? []}
          readOnly={readOnly}
          onOpenApp={noop}
          onOpenFolder={noop}
        />
      );
    default:
      return null;
  }
}

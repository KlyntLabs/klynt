import { NotesEditor } from "./notes-editor";
import styles from "./notes-renderer.module.css";
import { getText } from "./notes-utils";

type NotesRendererProps = {
  content: Record<string, unknown>;
  readOnly?: boolean;
  onChange?: (content: Record<string, unknown>) => void;
};

export function NotesRenderer({
  content,
  readOnly = false,
  onChange,
}: NotesRendererProps): React.JSX.Element {
  const text = getText(content);

  if (readOnly) {
    return (
      <div className={styles.readonly} data-testid="notes-readonly">
        {text}
      </div>
    );
  }

  return <NotesEditor content={content} onChange={onChange ?? (() => {})} />;
}

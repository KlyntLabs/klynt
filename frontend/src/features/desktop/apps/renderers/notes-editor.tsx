import { useEffect, useRef, useState } from "react";
import styles from "./notes-renderer.module.css";
import { getText } from "./notes-utils";

type NotesEditorProps = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  debounceMs?: number;
};

export function NotesEditor({
  content,
  onChange,
  debounceMs = 300,
}: NotesEditorProps): React.JSX.Element {
  const text = getText(content);
  const [draft, setDraft] = useState(text);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setDraft(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        onChange({ text: newValue });
      }
    }, debounceMs);
  };

  return (
    <textarea
      value={draft}
      onChange={handleChange}
      className={styles.editor}
      data-testid="notes-editor"
      aria-label="Notes editor"
    />
  );
}

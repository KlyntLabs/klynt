import { useEffect, useRef, useState } from "react";

type NotesEditorProps = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  debounceMs?: number;
};

function getText(content: Record<string, unknown>): string {
  const text = content.text;
  return typeof text === "string" ? text : "";
}

export function NotesEditor({
  content,
  onChange,
  debounceMs = 300,
}: NotesEditorProps): React.JSX.Element {
  const text = getText(content);
  const [draft, setDraft] = useState(text);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => {
    return () => {
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
      onChange({ text: newValue });
    }, debounceMs);
  };

  return (
    <textarea
      value={draft}
      onChange={handleChange}
      className="h-full w-full resize-none rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      data-testid="notes-editor"
      aria-label="Notes editor"
    />
  );
}

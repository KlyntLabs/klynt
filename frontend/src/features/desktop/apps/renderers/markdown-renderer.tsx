import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { useEffect, useMemo, useRef, useState } from "react";

type MarkdownRendererProps = {
  content: Record<string, unknown>;
  readOnly?: boolean;
  onChange?: (content: Record<string, unknown>) => void;
};

const DEBOUNCE_MS = 300;

function getText(content: Record<string, unknown>): string {
  const text = content.text;
  return typeof text === "string" ? text : "";
}

function renderMarkdown(text: string): string {
  const rawHtml = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}

export function MarkdownRenderer({
  content,
  readOnly = false,
  onChange,
}: MarkdownRendererProps): React.JSX.Element {
  const text = getText(content);
  const [draft, setDraft] = useState(text);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sanitizedHtml = useMemo(() => renderMarkdown(text), [text]);

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
      onChange?.({ text: newValue });
    }, DEBOUNCE_MS);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div
        className="flex-1 overflow-auto rounded-md border border-border bg-card p-4 text-foreground shadow-elevation-1"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized by DOMPurify before injection.
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        data-testid="markdown-preview"
      />
      {!readOnly && (
        <textarea
          value={draft}
          onChange={handleChange}
          className="h-32 w-full resize-none rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          data-testid="markdown-editor"
          aria-label="Markdown editor"
        />
      )}
    </div>
  );
}

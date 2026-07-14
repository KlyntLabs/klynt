import { TextArea } from "@astryxdesign/core/TextArea";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./markdown-renderer.module.css";

type MarkdownContent = {
  text: string;
};

type MarkdownRendererProps = {
  content: Record<string, unknown>;
  readOnly?: boolean;
  onChange?: (content: Record<string, unknown>) => void;
};

const DEBOUNCE_MS = 300;

function toMarkdownContent(content: Record<string, unknown>): MarkdownContent {
  const text = content.text;
  return { text: typeof text === "string" ? text : "" };
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
  const { text } = useMemo(() => toMarkdownContent(content), [content]);
  const [draft, setDraft] = useState(text);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const sanitizedHtml = useMemo(() => renderMarkdown(text), [text]);

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

  const handleChange = (newValue: string) => {
    setDraft(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        onChange?.({ text: newValue });
      }
    }, DEBOUNCE_MS);
  };

  return (
    <div className={styles.pane}>
      <div
        className={styles.preview}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized by DOMPurify before injection.
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }} // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        data-testid="markdown-preview"
      />
      {!readOnly && (
        // Astryx's TextArea owns the label, so the old aria-label becomes a hidden `label` —
        // the accessible name is unchanged. Height is rows-driven here, which suits this
        // fixed-height source pane (unlike the notes editor, which must fill the window).
        <TextArea
          label="Markdown editor"
          isLabelHidden
          rows={5}
          value={draft}
          onChange={handleChange}
          data-testid="markdown-editor"
        />
      )}
    </div>
  );
}

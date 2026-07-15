import { Markdown } from "@astryxdesign/core/Markdown";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useMemo, useRef, useState } from "react";

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

export function MarkdownRenderer({
  content,
  readOnly = false,
  onChange,
}: MarkdownRendererProps): React.JSX.Element {
  const { text } = useMemo(() => toMarkdownContent(content), [content]);
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
    <VStack height="100%" gap={3} padding={4}>
      {/*
       * Astryx's Markdown takes the markdown *string* and renders Astryx components from it.
       *
       * This replaced a `marked` -> `DOMPurify.sanitize` -> `dangerouslySetInnerHTML` pipeline,
       * and it is a security *improvement*, not a like-for-like swap: there is no longer an HTML
       * injection path to sanitise. Markdown never builds an HTML string and never touches
       * innerHTML (there is no `dangerouslySetInnerHTML` anywhere in @astryxdesign/core/Markdown,
       * and it exposes no allowHtml/rawHtml escape), so embedded HTML in the source — a <script>
       * tag, an onclick= handler — is inert text rather than sanitised markup. Sanitising a thing
       * you never construct is strictly safer than sanitising it well.
       *
       * `marked` and `isomorphic-dompurify` were used only here and are now removed from
       * package.json.
       */}
      <Markdown data-testid="markdown-preview">{text}</Markdown>
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
    </VStack>
  );
}

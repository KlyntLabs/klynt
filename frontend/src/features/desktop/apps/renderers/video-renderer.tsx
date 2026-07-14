import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./video-renderer.module.css";

type VideoRendererProps = {
  content: Record<string, unknown>;
  readOnly?: boolean;
  onChange?: (content: Record<string, unknown>) => void;
};

const DEBOUNCE_MS = 300;

function getSrc(content: Record<string, unknown>): string {
  const src = content.src;
  return typeof src === "string" ? src : "";
}

function isValidVideoUrl(url: string): boolean {
  return url.length > 0 && url.startsWith("https://");
}

export function VideoRenderer({
  content,
  readOnly = false,
  onChange,
}: VideoRendererProps): React.JSX.Element {
  const { t } = useTranslation("app");
  const src = getSrc(content);
  const [draft, setDraft] = useState(src);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setDraft(src);
  }, [src]);

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
        onChange?.({ src: newValue });
      }
    }, DEBOUNCE_MS);
  };

  const showHttpsWarning = draft.startsWith("http://");

  return (
    <div className={styles.pane}>
      {isValidVideoUrl(src) ? (
        // biome-ignore lint/a11y/useMediaCaption: Video source is user-provided and may not have captions available.
        <video controls src={src} className={styles.player} data-testid="video-player" />
      ) : (
        <div className={styles.emptyState} data-testid="video-empty-state">
          <Text type="body" color="secondary">
            {t("video.noUrl")}
          </Text>
        </div>
      )}
      {!readOnly && (
        <VStack gap={1}>
          {/* Astryx's TextInput has no `type="url"`: its type union is text|password|email, and
              `type` is applied after the rest spread, so it cannot be forced. `inputMode="url"`
              keeps the URL keyboard the old input gave — spread-cast because Astryx's BaseProps
              extends React.HTMLAttributes rather than InputHTMLAttributes, so input-only
              attributes are untyped even though rest props DO reach the <input>. Same rationale
              as the autoComplete cast in src/components/form/form-text-input.tsx.
              The warning message stays a sibling rather than TextInput's `status.message` so it
              keeps its data-testid; `status` still colours the field. */}
          <TextInput
            label={t("video.urlLabel")}
            isLabelHidden
            value={draft}
            onChange={handleChange}
            placeholder="https://"
            status={showHttpsWarning ? { type: "warning" } : undefined}
            data-testid="video-url-input"
            {...({ inputMode: "url" } as { inputMode?: "url" })}
          />
          {showHttpsWarning && (
            <Text type="supporting" size="sm" data-testid="video-https-warning">
              {t("video.httpsOnly")}
            </Text>
          )}
        </VStack>
      )}
    </div>
  );
}

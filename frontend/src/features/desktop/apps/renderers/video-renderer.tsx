import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

  useEffect(() => {
    setDraft(src);
  }, [src]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setDraft(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange?.({ src: newValue });
    }, DEBOUNCE_MS);
  };

  const showHttpsWarning = draft.startsWith("http://");

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {isValidVideoUrl(src) ? (
        // biome-ignore lint/a11y/useMediaCaption: Video source is user-provided and may not have captions available.
        <video
          controls
          src={src}
          className="max-w-full rounded-md shadow-elevation-1"
          data-testid="video-player"
        />
      ) : (
        <div
          className="flex flex-1 items-center justify-center rounded-md border border-border bg-card p-4 text-sm text-muted-foreground"
          data-testid="video-empty-state"
        >
          {t("video.noUrl")}
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-col gap-1">
          <input
            type="url"
            value={draft}
            onChange={handleChange}
            placeholder="https://"
            className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            data-testid="video-url-input"
            aria-label="Video URL"
          />
          {showHttpsWarning && (
            <span className="text-xs text-destructive" data-testid="video-https-warning">
              {t("video.httpsOnly")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

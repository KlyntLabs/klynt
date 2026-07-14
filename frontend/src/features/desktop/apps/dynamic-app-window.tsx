import { Heading } from "@astryxdesign/core/Heading";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type DesktopApp, desktopAppsApi } from "@/features/desktop/api/desktop-apps-api";
import { ConflictDialog } from "@/features/desktop/components/ConflictDialog";
import { useConflictHandler } from "@/features/desktop/components/use-conflict-handler";
import { buildAppManifest } from "./dynamic-app-manifest";
import styles from "./dynamic-app-window.module.css";
import { KNOWN_RENDERER_IDS, RendererSwitch } from "./renderers/renderer-switch";
import { useContentAutosave } from "./use-content-autosave";

type DynamicAppWindowProps = {
  desktopId: string;
  appId: string;
  tenantSlug: string;
};

function contentsAreEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function DynamicAppWindow({
  desktopId,
  appId,
  tenantSlug,
}: DynamicAppWindowProps): React.JSX.Element {
  const { t } = useTranslation(["home", "errors", "app"]);
  const queryClient = useQueryClient();
  const { isOpen, open, close, onReload, onRetry, setReloadCallback, setRetryCallback } =
    useConflictHandler();

  const {
    data: app,
    isLoading,
    error,
  } = useQuery<DesktopApp, Error>({
    queryKey: ["desktop-app", desktopId, tenantSlug, appId],
    queryFn: async () => {
      const response = await desktopAppsApi.getApp(tenantSlug, appId);
      return response.data.data;
    },
    enabled: tenantSlug.length > 0 && appId.length > 0,
    retry: false,
  });

  const [content, setContent] = useState<Record<string, unknown>>({});
  const [etag, setEtag] = useState<string>("");

  const manifest = useMemo(() => (app ? buildAppManifest({ app }) : null), [app]);

  useEffect(() => {
    if (!manifest) {
      return;
    }

    setContent((previous) =>
      contentsAreEqual(previous, manifest.content) ? previous : manifest.content
    );
    setEtag((previous) => (previous === manifest.etag ? previous : manifest.etag));
  }, [manifest]);

  const handleConflict = useCallback(() => {
    open();
  }, [open]);

  const { scheduleSave } = useContentAutosave({
    slug: tenantSlug,
    appId,
    etag,
    content,
    onConflict: handleConflict,
    onEtagChange: setEtag,
  });

  const scheduleSaveRef = useRef(scheduleSave);
  useEffect(() => {
    scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);

  useEffect(() => {
    setReloadCallback(() => {
      void queryClient.invalidateQueries({
        queryKey: ["desktop-app", desktopId, tenantSlug, appId],
      });
    });
  }, [setReloadCallback, queryClient, desktopId, tenantSlug, appId]);

  useEffect(() => {
    setRetryCallback(() => {
      scheduleSaveRef.current();
    });
  }, [setRetryCallback]);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Spinner />
      </div>
    );
  }

  if (error || !app || !manifest) {
    return (
      <div className={styles.centered}>
        <Text type="body" color="secondary">
          {t("errors:generic.message")}
        </Text>
      </div>
    );
  }

  if (!KNOWN_RENDERER_IDS.has(manifest.rendererId)) {
    return (
      <div className={styles.centered} data-testid="dynamic-app-empty-state">
        <Text type="body" color="secondary">
          {t("app.unknownRenderer")}
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.window} data-testid="dynamic-app-window">
      <div className={styles.header}>
        {/* Heading has no size prop — its scale comes from `level`. The window title needs the
            compact chrome size (heading-4 == the old text-sm) while keeping its place in the
            document outline, so the visual level is 4 and `accessibilityLevel` restores the h2. */}
        <Heading level={4} accessibilityLevel={2}>
          {manifest.title}
        </Heading>
      </div>
      <div className={styles.body}>
        <RendererSwitch
          rendererId={manifest.rendererId}
          content={content}
          readOnly={manifest.locked ?? false}
          onChange={setContent}
        />
      </div>
      <ConflictDialog open={isOpen} onReload={onReload} onRetry={onRetry} onClose={close} />
    </div>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { type DesktopApp, desktopAppsApi } from "@/features/desktop/api/desktop-apps-api";
import { ConflictDialog } from "@/features/desktop/components/ConflictDialog";
import { useConflictHandler } from "@/features/desktop/components/use-conflict-handler";
import { buildAppManifest } from "./dynamic-app-manifest";
import { KNOWN_RENDERER_IDS, RendererSwitch } from "./renderers/renderer-switch";
import { useContentAutosave } from "./use-content-autosave";

type DynamicAppWindowProps = {
  desktopId: string;
  appId: string;
  tenantSlug: string;
};

export function DynamicAppWindow({
  desktopId: _desktopId,
  appId,
  tenantSlug,
}: DynamicAppWindowProps): React.JSX.Element {
  const { t } = useTranslation(["home", "errors"]);
  const queryClient = useQueryClient();
  const { isOpen, open, close, onReload, onRetry, setReloadCallback, setRetryCallback } =
    useConflictHandler();

  const {
    data: app,
    isLoading,
    error,
  } = useQuery<DesktopApp, Error>({
    queryKey: ["desktop-app", tenantSlug, appId],
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
      JSON.stringify(previous) === JSON.stringify(manifest.content) ? previous : manifest.content
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

  useEffect(() => {
    setReloadCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["desktop-app", tenantSlug, appId] });
    });
  }, [setReloadCallback, queryClient, tenantSlug, appId]);

  useEffect(() => {
    setRetryCallback(() => {
      scheduleSave();
    });
  }, [setRetryCallback, scheduleSave]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !app || !manifest) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        {t("errors:generic.message")}
      </div>
    );
  }

  if (!KNOWN_RENDERER_IDS.has(manifest.rendererId)) {
    return (
      <div
        className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground"
        data-testid="dynamic-app-empty-state"
      >
        {t("app.unknownRenderer")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="dynamic-app-window">
      <div className="border-b border-border px-4 py-2">
        <h2 className="text-sm font-medium text-foreground">{manifest.title}</h2>
      </div>
      <div className="min-h-0 flex-1">
        <RendererSwitch
          rendererId={manifest.rendererId}
          content={content}
          readOnly={manifest.locked}
          onChange={setContent}
        />
      </div>
      <ConflictDialog open={isOpen} onReload={onReload} onRetry={onRetry} onClose={close} />
    </div>
  );
}

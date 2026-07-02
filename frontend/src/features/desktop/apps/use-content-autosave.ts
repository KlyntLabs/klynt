import { isAxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/core/api/api-error";
import { desktopAppsApi } from "../api/desktop-apps-api";

export type UseContentAutosaveOptions = {
  slug: string;
  appId: string;
  etag: string;
  content: Record<string, unknown>;
  menuConfig?: Record<string, unknown>;
  debounceMs?: number;
  onConflict?: () => void;
  onEtagChange?: (etag: string) => void;
  onError?: (error: Error) => void;
};

export type UseContentAutosaveResult = {
  isSaving: boolean;
  error: Error | null;
  scheduleSave: () => void;
};

const DEFAULT_DEBOUNCE_MS = 1500;

export function useContentAutosave(options: UseContentAutosaveOptions): UseContentAutosaveResult {
  const {
    slug,
    appId,
    etag,
    content,
    menuConfig,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onConflict,
    onEtagChange,
    onError,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const etagRef = useRef(etag);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    etagRef.current = etag;
  }, [etag]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const performSave = useCallback(async () => {
    if (!slug || !appId) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        etag: etagRef.current,
        content,
        menu_config: menuConfig,
      };

      const response = await desktopAppsApi.update(slug, appId, payload);
      const newEtag = response.data.data.etag;

      if (!isMountedRef.current) {
        return;
      }

      etagRef.current = newEtag;
      onEtagChange?.(newEtag);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      const isConflict =
        (err instanceof ApiError && err.status === 409) ||
        (isAxiosError(err) && err.response?.status === 409);

      if (isConflict) {
        const conflictError = new Error("The content was modified by another session.");
        setError(conflictError);
        onConflict?.();
        return;
      }

      const saveError = err instanceof Error ? err : new Error("Failed to save content.");
      setError(saveError);
      onError?.(saveError);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [slug, appId, content, menuConfig, onConflict, onEtagChange, onError]);

  const scheduleSave = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => performSave(), debounceMs);
  }, [clearTimer, performSave, debounceMs]);

  useEffect(() => {
    scheduleSave();
    return clearTimer;
  }, [scheduleSave, clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    isSaving,
    error,
    scheduleSave,
  };
}

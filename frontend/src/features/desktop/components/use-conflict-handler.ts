import { useCallback, useRef, useState } from "react";

export function useConflictHandler(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  onReload: () => void;
  onRetry: () => void;
  setReloadCallback: (cb: () => void) => void;
  setRetryCallback: (cb: () => void) => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const reloadRef = useRef<() => void>(() => {});
  const retryRef = useRef<() => void>(() => {});

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const onReload = useCallback(() => {
    reloadRef.current();
    setIsOpen(false);
  }, []);

  const onRetry = useCallback(() => {
    retryRef.current();
    setIsOpen(false);
  }, []);

  const setReloadCallback = useCallback((cb: () => void) => {
    reloadRef.current = cb;
  }, []);

  const setRetryCallback = useCallback((cb: () => void) => {
    retryRef.current = cb;
  }, []);

  return {
    isOpen,
    open,
    close,
    onReload,
    onRetry,
    setReloadCallback,
    setRetryCallback,
  };
}

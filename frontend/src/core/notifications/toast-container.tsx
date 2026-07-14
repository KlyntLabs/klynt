import { Button } from "@astryxdesign/core/Button";
import { Toast } from "@astryxdesign/core/Toast";
import styles from "./toast-container.module.css";
import { useToastStore } from "./toast-store";

/**
 * Astryx's Toast has two types: `info` and `error`. It has no `success`.
 *
 * The store still models success separately — the distinction is meaningful to callers, and
 * collapsing it there would lose information — but on screen a success renders as an info
 * toast. That is the design system's opinion (a success is a confirmation, not an alert), and
 * adopting Astryx means taking it. The visible change: success toasts are no longer green.
 */
function toastType(type: string): "info" | "error" {
  return type === "error" ? "error" : "info";
}

function ToastItem({
  id,
  message,
  type,
  duration,
  action,
}: {
  id: string;
  message: string;
  type: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    // Astryx owns the dismiss timer (and pauses it on hover/focus, which the hand-rolled
    // setTimeout never did); onDismiss is what evicts the entry from the store.
    <Toast
      body={message}
      type={toastType(type)}
      isAutoHide
      autoHideDuration={duration}
      onDismiss={() => removeToast(id)}
      endContent={
        action ? (
          <Button
            variant="secondary"
            size="sm"
            label={action.label}
            onClick={() => {
              action.onClick();
              removeToast(id);
            }}
          />
        ) : undefined
      }
    />
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div aria-live="polite" aria-atomic="true" className={styles.stack}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}

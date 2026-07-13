import { Button } from "@astryxdesign/core/Button";
import { useEffect } from "react";
import { useToastStore } from "./toast-store";

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

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  const color =
    type === "error"
      ? "bg-destructive text-destructive-foreground"
      : type === "success"
        ? "bg-success text-success-foreground"
        : "bg-primary text-primary-foreground";

  return (
    <output
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center gap-3 rounded-md px-4 py-2 shadow ${color}`}
    >
      <span>{message}</span>
      {action && (
        <Button
          variant="secondary"
          size="sm"
          label={action.label}
          onClick={() => {
            action.onClick();
            removeToast(id);
          }}
          className="border-current bg-transparent text-current hover:bg-white/20"
        />
      )}
    </output>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}

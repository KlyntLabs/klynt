import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ToastType = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  reset: () => void;
}

const initialState = {
  toasts: [],
};

let toastIdCounter = 0;

export const useToastStore = create<ToastState>()(
  devtools(
    (set) => ({
      ...initialState,
      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: `toast-${++toastIdCounter}` }],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),
      reset: () => set(initialState),
    }),
    { name: "toast-store" }
  )
);

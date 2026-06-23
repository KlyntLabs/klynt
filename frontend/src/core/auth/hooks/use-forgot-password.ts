import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { requestPasswordReset } from "../api/auth-api";
import type { ForgotPasswordInput } from "../types";

export function useForgotPassword(): UseMutationResult<void, Error, ForgotPasswordInput, unknown> {
  const addToast = useToastStore((state) => state.addToast);

  return useMutation<void, Error, ForgotPasswordInput>({
    mutationFn: requestPasswordReset,
    meta: { suppressToast: true },
    onSuccess: () => {
      addToast({
        message: "If an account exists, a reset link has been sent.",
        type: "success",
        duration: 5000,
      });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : "Request failed. Please try again.";
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

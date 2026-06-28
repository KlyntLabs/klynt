import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { requestPasswordReset } from "../api/auth-api";
import type { ForgotPasswordInput } from "../types";

export function useForgotPassword(): UseMutationResult<void, Error, ForgotPasswordInput, unknown> {
  const { t } = useTranslation("auth");
  const addToast = useToastStore((state) => state.addToast);

  return useMutation<void, Error, ForgotPasswordInput>({
    mutationFn: requestPasswordReset,
    meta: { suppressToast: true },
    onSuccess: () => {
      addToast({
        message: t("forgotPassword.success"),
        type: "success",
        duration: 5000,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("forgotPassword.error");
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

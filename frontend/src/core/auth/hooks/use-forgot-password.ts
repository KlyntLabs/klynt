import { useToast } from "@astryxdesign/core/Toast";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/core/api/api-error";
import { requestPasswordReset } from "../api/auth-api";
import type { ForgotPasswordInput } from "../types";

export function useForgotPassword(): UseMutationResult<void, Error, ForgotPasswordInput, unknown> {
  const { t } = useTranslation("auth");
  const toast = useToast();

  return useMutation<void, Error, ForgotPasswordInput>({
    mutationFn: requestPasswordReset,
    meta: { suppressToast: true },
    onSuccess: () => {
      // Astryx's Toast has two types, `info` and `error` — there is no `success`. A success is a
      // confirmation, not an alert, so it renders as an info toast. That is the design system's
      // opinion and adopting it is the point; the visible change is that this is no longer green.
      toast({
        body: t("forgotPassword.success"),
        type: "info",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("forgotPassword.error");
      toast({ body: message, type: "error", isAutoHide: true, autoHideDuration: 5000 });
    },
  });
}

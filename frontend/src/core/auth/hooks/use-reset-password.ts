import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { resetPassword } from "../api/auth-api";
import type { ResetPasswordInput } from "../types";

export function useResetPassword(): UseMutationResult<void, Error, ResetPasswordInput, unknown> {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const addToast = useToastStore((state) => state.addToast);

  return useMutation<void, Error, ResetPasswordInput>({
    mutationFn: resetPassword,
    meta: { suppressToast: true },
    onSuccess: () => {
      navigate("/login", { replace: true });
      addToast({
        message: t("resetPassword.success"),
        type: "success",
        duration: 5000,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("resetPassword.error");
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { verifyEmail } from "../api/auth-api";
import type { VerifyEmailInput } from "../types";

export function useVerifyEmail(): UseMutationResult<void, Error, VerifyEmailInput, unknown> {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const addToast = useToastStore((state) => state.addToast);

  return useMutation<void, Error, VerifyEmailInput>({
    mutationFn: verifyEmail,
    meta: { suppressToast: true },
    onSuccess: () => {
      navigate("/onboarding", { replace: true });
      addToast({
        message: t("verifyEmail.success"),
        type: "success",
        duration: 5000,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("verifyEmail.error");
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

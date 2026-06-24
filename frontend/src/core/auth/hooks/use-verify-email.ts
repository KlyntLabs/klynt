import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { routePaths } from "@/core/routing/route-paths";
import { getMe, verifyEmail } from "../api/auth-api";
import { useAuthStore } from "../auth-store";
import type { VerifyEmailInput } from "../types";

export function useVerifyEmail(): UseMutationResult<void, Error, VerifyEmailInput, unknown> {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const addToast = useToastStore((state) => state.addToast);
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation<void, Error, VerifyEmailInput>({
    mutationFn: verifyEmail,
    meta: { suppressToast: true },
    onSuccess: async () => {
      try {
        const user = await getMe();
        setSession(user);
      } catch {
        // Session cookie is set; auth hydrator will reconcile on next route.
      }
      navigate(routePaths.onboarding, { replace: true });
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

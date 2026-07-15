import { useToast } from "@astryxdesign/core/Toast";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { routePaths } from "@/core/routing/route-paths";
import { getMe, verifyEmail } from "../api/auth-api";
import { useAuthStore } from "../auth-store";
import type { VerifyEmailInput } from "../types";

export function useVerifyEmail(): UseMutationResult<void, Error, VerifyEmailInput, unknown> {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const toast = useToast();
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
      // Astryx's Toast has two types, `info` and `error` — there is no `success`. A success is a
      // confirmation, not an alert, so it renders as an info toast. That is the design system's
      // opinion and adopting it is the point; the visible change is that this is no longer green.
      toast({
        body: t("verifyEmail.success"),
        type: "info",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("verifyEmail.error");
      toast({ body: message, type: "error", isAutoHide: true, autoHideDuration: 5000 });
    },
  });
}

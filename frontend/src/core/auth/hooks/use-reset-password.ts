import { useToast } from "@astryxdesign/core/Toast";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { resetPassword } from "../api/auth-api";
import type { ResetPasswordInput } from "../types";

export function useResetPassword(): UseMutationResult<void, Error, ResetPasswordInput, unknown> {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const toast = useToast();

  return useMutation<void, Error, ResetPasswordInput>({
    mutationFn: resetPassword,
    meta: { suppressToast: true },
    onSuccess: () => {
      navigate("/login", { replace: true });
      // Astryx's Toast has two types, `info` and `error` — there is no `success`. A success is a
      // confirmation, not an alert, so it renders as an info toast. That is the design system's
      // opinion and adopting it is the point; the visible change is that this is no longer green.
      toast({
        body: t("resetPassword.success"),
        type: "info",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("resetPassword.error");
      toast({ body: message, type: "error", isAutoHide: true, autoHideDuration: 5000 });
    },
  });
}

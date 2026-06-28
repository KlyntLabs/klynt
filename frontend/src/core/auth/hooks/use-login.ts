import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { login } from "../api/auth-api";
import { useAuthStore } from "../auth-store";
import { navigateExternal } from "../external-redirect";
import type { LoginInput } from "../types";
import { useRedirectTarget } from "./use-redirect-target";

export function useLogin(): UseMutationResult<void, Error, LoginInput, unknown> {
  const { t } = useTranslation("auth");
  const addToast = useToastStore((state) => state.addToast);
  const setSession = useAuthStore((state) => state.setSession);
  const redirectTarget = useRedirectTarget();

  return useMutation<void, Error, LoginInput>({
    mutationFn: async (input) => {
      const user = await login(input);
      setSession(user);
    },
    meta: { suppressToast: true },
    onSuccess: () => {
      navigateExternal(redirectTarget);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("login.error");
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

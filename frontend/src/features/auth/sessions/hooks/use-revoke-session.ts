import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { revokeSession } from "../api/session-api";

export function useRevokeSession() {
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: revokeSession,
    meta: { suppressToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      addToast({
        message: t("sessions.revokeError", { message: apiError.message }),
        type: "error",
        duration: 5000,
      });
    },
  });
}

import { useToast } from "@astryxdesign/core/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { revokeSession } from "../api/session-api";

export function useRevokeSession() {
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: revokeSession,
    meta: { suppressToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      toast({
        body: t("sessions.revokeError", { message: apiError.message }),
        type: "error",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
  });
}

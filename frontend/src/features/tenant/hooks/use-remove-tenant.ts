import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { removeTenant } from "../api/tenant-api";

export function useRemoveTenant(slug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: () => removeTenant(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.removeQueries({ queryKey: ["tenants", slug] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      addToast({
        message: t("settings.removeError", { message: apiError.message }),
        type: "error",
        duration: 5000,
      });
    },
  });
}

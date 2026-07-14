import { useToast } from "@astryxdesign/core/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { removeTenant } from "../api/tenant-api";

export function useRemoveTenant(slug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: () => removeTenant(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.removeQueries({ queryKey: ["tenants", slug] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      toast({
        body: t("settings.removeError", { message: apiError.message }),
        type: "error",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
  });
}

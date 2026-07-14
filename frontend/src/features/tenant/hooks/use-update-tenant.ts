import { useToast } from "@astryxdesign/core/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { updateTenant } from "../api/tenant-api";
import type { UpdateTenantInput } from "../types";

export function useUpdateTenant(slug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: UpdateTenantInput) => updateTenant(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["tenants", slug] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      toast({
        body: t("settings.updateError", { message: apiError.message }),
        type: "error",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
  });
}

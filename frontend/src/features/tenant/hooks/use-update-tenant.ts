import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { updateTenant } from "../api/tenant-api";
import type { UpdateTenantInput } from "../types";

export function useUpdateTenant(slug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (input: UpdateTenantInput) => updateTenant(slug, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["tenants", slug] });
      const nextSlug = variables.slug ?? slug;
      void queryClient.invalidateQueries({ queryKey: ["tenants", nextSlug] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      addToast({
        message: t("settings.updateError", { message: apiError.message }),
        type: "error",
        duration: 5000,
      });
    },
  });
}

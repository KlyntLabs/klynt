import { useToast } from "@astryxdesign/core/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { memberApi } from "../api/member-api";

export function useRemoveMember(tenantSlug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (email: string) => memberApi.remove(tenantSlug, email),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "members"] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      toast({
        body: t("members.removeError", { message: apiError.message }),
        type: "error",
        isAutoHide: true,
        autoHideDuration: 5000,
      });
    },
  });
}

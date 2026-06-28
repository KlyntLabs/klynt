import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { memberApi } from "../api/member-api";
import type { UpdateMemberRoleInput } from "../types";

export function useUpdateMemberRole(tenantSlug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (input: UpdateMemberRoleInput) => memberApi.updateRole(tenantSlug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "members"] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      addToast({
        message: t("members.updateRoleError", { message: apiError.message }),
        type: "error",
        duration: 5000,
      });
    },
  });
}

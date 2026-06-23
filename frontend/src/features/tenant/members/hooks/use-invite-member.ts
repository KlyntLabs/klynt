import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { memberApi } from "../api/member-api";
import type { InviteMemberInput } from "../types";

export function useInviteMember(tenantSlug: string) {
  const { t } = useTranslation("tenant");
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data } = await memberApi.invite(tenantSlug, input);
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "members"] });
    },
    onError: (error) => {
      const apiError = createApiError(error);
      addToast({
        message: t("members.inviteError", { message: apiError.message }),
        type: "error",
        duration: 5000,
      });
    },
  });
}

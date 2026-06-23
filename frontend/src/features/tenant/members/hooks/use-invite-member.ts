import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberApi } from "../api/member-api";
import type { InviteMemberInput } from "../types";

export function useInviteMember(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data } = await memberApi.invite(tenantSlug, input);
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "members"] });
    },
  });
}

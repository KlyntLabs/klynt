import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberApi } from "../api/member-api";
import type { UpdateMemberRoleInput } from "../types";

export function useUpdateMemberRole(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMemberRoleInput) => memberApi.updateRole(tenantSlug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "members"] });
    },
  });
}

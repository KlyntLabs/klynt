import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberApi } from "../api/member-api";

export function useRemoveMember(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => memberApi.remove(tenantSlug, email),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "members"] });
    },
  });
}

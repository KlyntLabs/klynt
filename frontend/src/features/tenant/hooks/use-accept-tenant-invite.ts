import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptTenantInvite } from "../api/tenant-api";

export function useAcceptTenantInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptTenantInvite,
    meta: { suppressToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

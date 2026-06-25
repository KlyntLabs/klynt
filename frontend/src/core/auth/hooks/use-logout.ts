import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildLoginUrl } from "@/core/routing/subdomain-url";
import { logout } from "../api/auth-api";
import { useAuthStore } from "../auth-store";
import { navigateExternal } from "../external-redirect";

export function useLogout(): UseMutationResult<void, Error, void, unknown> {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  const finishLogout = () => {
    clearSession();
    // Drop cached tenant/auth data so a subsequent login under a different
    // account does not see stale membership information.
    queryClient.clear();
    navigateExternal(buildLoginUrl());
  };

  return useMutation<void, Error, void>({
    mutationFn: logout,
    onSuccess: finishLogout,
    onError: finishLogout,
  });
}

import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { buildLoginUrl } from "@/core/routing/subdomain-url";
import { logout } from "../api/auth-api";
import { useAuthStore } from "../auth-store";
import { navigateExternal } from "../external-redirect";

export function useLogout(): UseMutationResult<void, Error, void, unknown> {
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation<void, Error, void>({
    mutationFn: logout,
    onSuccess: () => {
      clearSession();
      navigateExternal(buildLoginUrl());
    },
    onError: () => {
      clearSession();
      navigateExternal(buildLoginUrl());
    },
  });
}

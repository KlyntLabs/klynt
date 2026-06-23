import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "../api/auth-api";
import { useAuthStore } from "../auth-store";

export function useLogout(): UseMutationResult<void, Error, void, unknown> {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation<void, Error, void>({
    mutationFn: logout,
    onSuccess: () => {
      clearSession();
      navigate("/login", { replace: true });
    },
    onError: () => {
      clearSession();
      navigate("/login", { replace: true });
    },
  });
}

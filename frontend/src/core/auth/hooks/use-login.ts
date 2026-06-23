import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { login } from "../api/auth-api";
import { useAuthStore } from "../auth-store";
import type { LoginInput } from "../types";

export function useLogin(): UseMutationResult<void, Error, LoginInput, unknown> {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation<void, Error, LoginInput>({
    mutationFn: async (input) => {
      const user = await login(input);
      setSession(user);
    },
    meta: { suppressToast: true },
    onSuccess: () => {
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Login failed. Please try again.";
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

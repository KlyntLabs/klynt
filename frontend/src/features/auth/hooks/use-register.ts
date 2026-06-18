import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { routePaths } from "@/core/routing/route-paths";
import { registerUser } from "@/features/auth/api/register";
import type { RegisterInput } from "@/features/auth/api/types";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export function useRegister() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
    meta: { suppressToast: true },
    onSuccess: (data) => {
      navigate(routePaths.registerSuccess, {
        state: { user: { name: data.name, email: data.email } },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "rate_limited") {
        addToast({
          message: "Too many registration attempts. Please try again later.",
          type: "error",
          duration: 5000,
        });
      }
    },
  });
}

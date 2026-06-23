import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { verifyEmail } from "../api/auth-api";
import type { VerifyEmailInput } from "../types";

export function useVerifyEmail(): UseMutationResult<void, Error, VerifyEmailInput, unknown> {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation<void, Error, VerifyEmailInput>({
    mutationFn: verifyEmail,
    meta: { suppressToast: true },
    onSuccess: () => {
      navigate("/login", { replace: true });
      addToast({
        message: "Email verified successfully. Please log in.",
        type: "success",
        duration: 5000,
      });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : "Verification failed. Please request a new link.";
      addToast({ message, type: "error", duration: 5000 });
    },
  });
}

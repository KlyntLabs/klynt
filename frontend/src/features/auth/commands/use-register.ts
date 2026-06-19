import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateIdempotencyKey } from "@/core/api/api-client";
import { ApiError } from "@/core/api/api-error";
import { useToastStore } from "@/core/notifications/toast-store";
import { routePaths } from "@/core/routing/route-paths";
import { registerUser } from "@/features/auth/api/register";
import type { RegisterInput, RegisterResponse } from "@/features/auth/api/types";

export function useRegister(): UseMutationResult<RegisterResponse, Error, RegisterInput, unknown> {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  const mutation = useMutation<RegisterResponse, Error, RegisterInput>({
    mutationFn: (input: RegisterInput) => registerUser(input, idempotencyKeyRef.current),
    retry: 1,
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

  const mutateAsync = useCallback(
    async (input: RegisterInput) => {
      idempotencyKeyRef.current = generateIdempotencyKey();
      return mutation.mutateAsync(input);
    },
    [mutation]
  );

  return { ...mutation, mutateAsync };
}

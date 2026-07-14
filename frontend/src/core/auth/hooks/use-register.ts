import { useToast } from "@astryxdesign/core/Toast";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/core/api/api-error";
import { register } from "../api/auth-api";
import type { RegisterInput } from "../types";

export function useRegister(): UseMutationResult<
  { userId: string },
  Error,
  RegisterInput,
  unknown
> {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const toast = useToast();

  return useMutation<{ userId: string }, Error, RegisterInput>({
    mutationFn: register,
    meta: { suppressToast: true },
    onSuccess: (_data, input) => {
      navigate("/register/success", { state: { email: input.email } });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t("register.error");
      toast({ body: message, type: "error", isAutoHide: true, autoHideDuration: 5000 });
    },
  });
}

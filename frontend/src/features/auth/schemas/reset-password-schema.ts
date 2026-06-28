import { useTranslation } from "react-i18next";
import { z } from "zod";

export function useResetPasswordSchema() {
  const { t } = useTranslation("validation");

  return z
    .object({
      password: z
        .string()
        .min(8, t("passwordMin"))
        .regex(/[A-Z]/, t("passwordUppercase"))
        .regex(/[a-z]/, t("passwordLowercase"))
        .regex(/\d/, t("passwordNumber")),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

export type ResetPasswordSchema = z.infer<ReturnType<typeof useResetPasswordSchema>>;

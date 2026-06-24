import { useTranslation } from "react-i18next";
import { z } from "zod";

export function useRegisterSchema() {
  const { t } = useTranslation("validation");

  return z.object({
    name: z.string().min(1, t("nameRequired")).max(200, t("nameMax")),
    username: z.string().min(1, t("usernameRequired")).max(50, t("usernameMax")),
    email: z.string().email(t("emailInvalid")),
    password: z
      .string()
      .min(8, t("passwordMin"))
      .regex(/[A-Z]/, t("passwordUppercase"))
      .regex(/[a-z]/, t("passwordLowercase"))
      .regex(/\d/, t("passwordNumber")),
  });
}

export type RegisterSchema = z.infer<ReturnType<typeof useRegisterSchema>>;

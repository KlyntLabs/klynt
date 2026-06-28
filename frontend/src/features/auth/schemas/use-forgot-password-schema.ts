import { useTranslation } from "react-i18next";
import { z } from "zod";

export function useForgotPasswordSchema() {
  const { t } = useTranslation("validation");

  return z.object({
    email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
  });
}

export type ForgotPasswordSchema = z.infer<ReturnType<typeof useForgotPasswordSchema>>;

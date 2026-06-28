import { useTranslation } from "react-i18next";
import { z } from "zod";

export function useLoginSchema() {
  const { t } = useTranslation("validation");

  return z.object({
    email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
    rememberMe: z.boolean(),
  });
}

export type LoginSchema = z.infer<ReturnType<typeof useLoginSchema>>;

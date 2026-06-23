import { z } from "zod";
import i18n from "@/core/i18n/config";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, i18n.t("validation:emailRequired"))
    .email(i18n.t("validation:emailInvalid")),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

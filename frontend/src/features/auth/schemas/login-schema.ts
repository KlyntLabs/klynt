import { z } from "zod";
import i18n from "@/core/i18n/config";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, i18n.t("validation:emailRequired"))
    .email(i18n.t("validation:emailInvalid")),
  password: z.string().min(1, i18n.t("validation:passwordRequired")),
  rememberMe: z.boolean(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

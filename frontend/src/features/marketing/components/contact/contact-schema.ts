import type { TFunction } from "i18next";
import { z } from "zod";

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function createContactSchema(t: TFunction<"marketing", undefined>) {
  return z.object({
    name: z.string().min(1, t("talkToHuman.form.fields.name.error")),
    email: z
      .string()
      .min(1, t("talkToHuman.form.fields.email.errorRequired"))
      .email(t("talkToHuman.form.fields.email.errorInvalid")),
    subject: z.string().optional(),
    message: z.string().min(1, t("talkToHuman.form.fields.message.error")),
  });
}

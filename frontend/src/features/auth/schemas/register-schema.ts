import { useTranslation } from "react-i18next";
import { z } from "zod";

const ROLES = ["student", "teacher", "admin", "parent"] as const;

export function useRegisterSchema() {
  const { t } = useTranslation("validation");

  return z
    .object({
      name: z.string().min(1, t("nameRequired")).max(200, t("nameMax")),
      email: z.string().email(t("emailInvalid")),
      password: z.string().min(12, t("passwordMin")),
      role: z.enum(ROLES, { message: t("roleRequired") }),
      institutionId: z.string().uuid(t("institutionIdInvalid")).optional(),
      termsAccepted: z.boolean().refine((value) => value === true, {
        message: t("termsRequired"),
      }),
      termsVersion: z.string().min(1, t("termsVersionRequired")),
    })
    .superRefine((data, ctx) => {
      if ((data.role === "teacher" || data.role === "admin") && !data.institutionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institutionId"],
          message: t("institutionIdRequired"),
        });
      }
    });
}

export type RegisterSchema = z.infer<ReturnType<typeof useRegisterSchema>>;

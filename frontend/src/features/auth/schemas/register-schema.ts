import { z } from "zod";

const ROLES = ["student", "teacher", "admin", "parent"] as const;

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    role: z.enum(ROLES, { message: "Select a role" }),
    institutionId: z.string().uuid("Enter a valid institution ID").optional(),
    termsAccepted: z.boolean().refine((value) => value === true, {
      message: "You must accept the terms",
    }),
    termsVersion: z.string().min(1, "Terms version is required"),
  })
  .superRefine((data, ctx) => {
    if ((data.role === "teacher" || data.role === "admin") && !data.institutionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["institutionId"],
        message: "Institution is required for this role",
      });
    }
  });

export type RegisterSchema = z.infer<typeof registerSchema>;

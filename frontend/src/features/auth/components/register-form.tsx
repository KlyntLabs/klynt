import { FormProvider } from "react-hook-form";
import { Button } from "@/core/ui/button";
import { InputField } from "@/core/forms/input-field";
import { SelectField } from "@/core/forms/select-field";
import { CheckboxField } from "@/core/forms/checkbox-field";
import { useZodForm } from "@/core/forms/use-zod-form";
import { registerSchema } from "@/features/auth/schemas/register-schema";
import { useRegister } from "@/features/auth/hooks/use-register";
import { ApiError } from "@/core/api/api-error";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
  { value: "parent", label: "Parent" },
];

const CURRENT_TERMS_VERSION = "2026-06-18";

export function RegisterForm() {
  const register = useRegister();
  const form = useZodForm(registerSchema, {
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "student",
      termsAccepted: false,
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });

  const selectedRole = form.watch("role");
  const requiresInstitution = selectedRole === "teacher" || selectedRole === "admin";

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await register.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError && (error.code === "bad_request" || error.code === "conflict")) {
        form.setError("root", { message: error.message });
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InputField name="name" label="Full name" placeholder="Ada Lovelace" />
        <InputField name="email" label="Email" type="email" placeholder="ada@example.com" />
        <InputField name="password" label="Password" type="password" />
        <SelectField
          name="role"
          label="I am a"
          options={ROLE_OPTIONS}
          placeholder="Select a role"
        />
        {requiresInstitution && (
          <InputField
            name="institutionId"
            label="Institution ID"
            placeholder="550e8400-e29b-41d4-a716-446655440001"
          />
        )}
        <CheckboxField
          name="termsAccepted"
          label={
            <>
              I agree to the{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
            </>
          }
        />
        {form.formState.errors.root && (
          <p className="text-sm text-red-600" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" isLoading={register.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </FormProvider>
  );
}

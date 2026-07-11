import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/core/api/api-error";
import { useForgotPassword } from "@/core/auth/hooks/use-forgot-password";
import type { ForgotPasswordSchema } from "@/features/auth/schemas/use-forgot-password-schema";
import { useForgotPasswordSchema } from "@/features/auth/schemas/use-forgot-password-schema";

export function ForgotPasswordForm() {
  const { t } = useTranslation(["auth", "validation"]);
  const forgot = useForgotPassword();
  const forgotPasswordSchema = useForgotPasswordSchema();
  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await forgot.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError) {
        form.setError("root", { message: error.message });
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:forgotPassword.email.label")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth:forgotPassword.email.placeholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={forgot.isPending} className="w-full">
          {forgot.isPending && <Spinner className="mr-2 size-4" />}
          {t("auth:forgotPassword.submit")}
        </Button>
      </form>
    </Form>
  );
}

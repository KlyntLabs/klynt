import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/core/api/api-error";
import { useRegister } from "@/core/auth/hooks/use-register";
import { useRegisterSchema } from "@/features/auth/schemas/register-schema";

export function RegisterForm() {
  const { t } = useTranslation(["auth", "validation"]);
  const registerSchema = useRegisterSchema();
  const register = useRegister();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await register.mutateAsync(data);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "bad_request" || error.code === "conflict")
      ) {
        form.setError("root", { message: error.message });
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.name.label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth:register.name.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.username.label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth:register.username.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.email.label")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("auth:register.email.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.password.label")}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
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
        <Button type="submit" disabled={register.isPending} className="w-full">
          {register.isPending && <Spinner className="mr-2 size-4" />}
          {t("auth:register.submit")}
        </Button>
      </form>
    </Form>
  );
}

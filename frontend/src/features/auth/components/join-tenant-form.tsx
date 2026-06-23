import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/core/api/api-error";
import { useAcceptTenantInvite } from "@/features/tenant";

interface JoinTenantFormProps {
  onSuccess?: () => void;
}

export function JoinTenantForm({ onSuccess }: JoinTenantFormProps) {
  const { t } = useTranslation(["auth", "validation"]);
  const mutation = useAcceptTenantInvite();

  const schema = z.object({
    token: z.string().min(1, t("validation:inviteCodeRequired")),
  });

  type JoinTenantSchema = z.infer<typeof schema>;

  const form = useForm<JoinTenantSchema>({
    resolver: zodResolver(schema),
    defaultValues: { token: "" },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data.token);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("auth:onboarding.inviteCode.error");
      form.setError("root", { message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:onboarding.inviteCode.label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth:onboarding.inviteCode.placeholder")} {...field} />
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
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending && <Spinner className="mr-2 size-4" />}
          {t("auth:onboarding.inviteCode.submit")}
        </Button>
      </form>
    </Form>
  );
}

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createApiError } from "@/core/api/api-error";
import { routePaths } from "@/core/routing/route-paths";
import { useRemoveTenant } from "../hooks/use-remove-tenant";
import { useTenant } from "../hooks/use-tenant";
import { useUpdateTenant } from "../hooks/use-update-tenant";
import type { UpdateTenantInput } from "../types";

export default function TenantSettingsPage() {
  const { t } = useTranslation("tenant");
  const { slug } = useParams<{ slug: string }>();
  const tenantSlug = slug ?? "";
  const navigate = useNavigate();

  const { data: tenant, isLoading, error } = useTenant(tenantSlug);
  const updateMutation = useUpdateTenant(tenantSlug);
  const removeMutation = useRemoveTenant(tenantSlug);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<UpdateTenantInput>({
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (tenant) {
      form.reset({ name: tenant.name });
    }
  }, [tenant, form]);

  async function handleSubmit(data: UpdateTenantInput) {
    if (data.name === tenant?.name) return;
    await updateMutation.mutateAsync(data);
  }

  async function handleRemove() {
    await removeMutation.mutateAsync(undefined, {
      onSuccess: () => {
        navigate(routePaths.dashboard);
      },
    });
  }

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("settings.loadErrorTitle")}</AlertTitle>
        <AlertDescription>{t("settings.loadErrorMessage")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.generalTitle")}</CardTitle>
          <CardDescription>{t("settings.generalDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: t("settings.nameRequired") }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="tenant-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2">
                <FormLabel>{t("settings.slugLabel")}</FormLabel>
                <Input value={tenantSlug} disabled readOnly data-testid="tenant-slug-input" />
              </div>
              {updateMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("settings.updateError", {
                      message: createApiError(updateMutation.error).message,
                    })}
                  </AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                disabled={
                  !form.formState.isDirty || form.formState.isSubmitting || updateMutation.isPending
                }
                data-testid="save-tenant-button"
              >
                {t("settings.saveButton")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings.dangerTitle")}</CardTitle>
          <CardDescription>{t("settings.dangerDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="delete-tenant-button">
                {t("settings.deleteButton")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.deleteConfirmMessage")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
                  {t("settings.cancelButton")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  disabled={removeMutation.isPending}
                  data-testid="confirm-delete-tenant"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("settings.deleteButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

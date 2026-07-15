import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/components/form/form-text-input";
import { createApiError } from "@/core/api/api-error";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildAdminUrl } from "@/core/routing/subdomain-router";
import { useRemoveTenant } from "../hooks/use-remove-tenant";
import { useTenant } from "../hooks/use-tenant";
import { useTenantSlug } from "../hooks/use-tenant-slug";
import { useUpdateTenant } from "../hooks/use-update-tenant";
import type { UpdateTenantInput } from "../types";

export default function TenantSettingsPage() {
  const { t } = useTranslation("tenant");
  const tenantSlug = useTenantSlug();

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
    form.reset(data);
  }

  async function handleRemove() {
    await removeMutation.mutateAsync(undefined, {
      onSuccess: () => {
        navigateExternal(buildAdminUrl());
      },
    });
  }

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <Banner
        status="error"
        title={t("settings.loadErrorTitle")}
        description={t("settings.loadErrorMessage")}
      />
    );
  }

  return (
    <VStack gap={6} maxWidth={672}>
      <Heading level={1}>{t("settings.title")}</Heading>

      {/* Section, not Card: Astryx reserves Card for discrete items (one profile, one
          notification) and prescribes Section for settings groups and page regions. */}
      <Section>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>{t("settings.generalTitle")}</Heading>
            <Text type="supporting">{t("settings.generalDescription")}</Text>
          </VStack>

          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <VStack gap={4}>
              <FormTextInput
                control={form.control}
                name="name"
                label={t("settings.nameLabel")}
                rules={{ required: t("settings.nameRequired") }}
                testId="tenant-name-input"
              />
              {/* The slug is immutable. Astryx models this as EITHER isDisabled (sets
                  `disabled`) OR disabledMessage (sets `readOnly` + aria-disabled, keeping the
                  field focusable) — never both: TextInput assigns readOnly AFTER spreading
                  rest props, so a passed-in readOnly is overwritten. The old markup set both,
                  but `readonly` is inert on a disabled input, so nothing user-visible changes. */}
              <TextInput
                label={t("settings.slugLabel")}
                value={tenantSlug}
                isDisabled
                data-testid="tenant-slug-input"
              />
              {updateMutation.error && (
                <Banner
                  status="error"
                  title={t("settings.updateError", {
                    message: createApiError(updateMutation.error).message,
                  })}
                />
              )}
              <Button
                type="submit"
                variant="primary"
                label={t("settings.saveButton")}
                isDisabled={!form.formState.isDirty || updateMutation.isPending}
                isLoading={form.formState.isSubmitting || updateMutation.isPending}
                data-testid="save-tenant-button"
              />
            </VStack>
          </form>
        </VStack>
      </Section>

      <Section>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>{t("settings.dangerTitle")}</Heading>
            <Text type="supporting">{t("settings.dangerDescription")}</Text>
          </VStack>

          <Button
            variant="destructive"
            label={t("settings.deleteButton")}
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="delete-tenant-button"
          />

          <AlertDialog
            isOpen={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            title={t("settings.deleteConfirmTitle")}
            description={t("settings.deleteConfirmMessage")}
            cancelLabel={t("settings.cancelButton")}
            actionLabel={t("settings.deleteButton")}
            onAction={handleRemove}
            isActionLoading={removeMutation.isPending}
          />
        </VStack>
      </Section>
    </VStack>
  );
}

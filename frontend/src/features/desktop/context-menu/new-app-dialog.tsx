import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { type AppTypeId, isAppType, listAppTypes } from "../apps/app-type-registry";

type NewAppDialogProps = {
  open: boolean;
  defaultType?: AppTypeId;
  onClose: () => void;
  onCreate: (values: { type: AppTypeId; title: string }) => void | Promise<void>;
};

const MAX_TITLE_LENGTH = 100;

export function NewAppDialog({
  open,
  defaultType = "folder",
  onClose,
  onCreate,
}: NewAppDialogProps): React.JSX.Element | null {
  const { t } = useTranslation("home");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<AppTypeId>(defaultType);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setType(defaultType);
      setError(null);
    }
  }, [open, defaultType]);

  const appTypes = React.useMemo(() => listAppTypes(), []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError(t("desktop.dialog.newApp.titleRequired", "Title is required."));
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(t("desktop.dialog.newApp.titleTooLong", "Title must be 100 characters or less."));
      return;
    }

    try {
      await onCreate({ type, title: trimmedTitle });
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    }
  };

  if (!open) {
    return null;
  }

  return (
    // purpose="form": a backdrop click must not silently discard a half-typed app name.
    <Dialog isOpen={open} onOpenChange={(isOpen) => !isOpen && onClose()} purpose="form">
      <VStack gap={4}>
        <DialogHeader
          title={t("desktop.dialog.newApp.title", "Create new app")}
          subtitle={t(
            "desktop.dialog.newApp.description",
            "Choose a type and name for your new app."
          )}
          onOpenChange={(isOpen) => !isOpen && onClose()}
        />
        <form id="new-app-form" onSubmit={handleSubmit}>
          <VStack gap={4}>
            {/* Astryx's TextInput and Selector own their label, description and validation
                status, so the Field/FieldLabel/FieldContent/FieldError scaffolding is gone.
                The error becomes `status`, which is what sets aria-invalid. */}
            <TextInput
              label={t("desktop.dialog.newApp.titleLabel", "Title")}
              value={title}
              onChange={setTitle}
              status={error ? { type: "error", message: error } : undefined}
              // maxLength is spread, not passed as a typed prop: Astryx's BaseProps extends
              // React.HTMLAttributes rather than InputHTMLAttributes, so input-only attributes
              // are absent from TextInputProps even though rest props DO reach the <input>.
              // Same rationale as the autoComplete cast in src/components/form/form-text-input.tsx.
              {...({ maxLength: MAX_TITLE_LENGTH } as { maxLength?: number })}
            />
            <Selector
              label={t("desktop.dialog.newApp.typeLabel", "Type")}
              value={type}
              onChange={(value) => {
                if (isAppType(value)) {
                  setType(value);
                }
              }}
              options={appTypes.map((appType) => ({
                value: appType.id,
                label: appType.label,
              }))}
            />
          </VStack>
        </form>
        <HStack gap={2} justify="end">
          <Button
            type="button"
            variant="secondary"
            label={t("desktop.dialog.newApp.cancel", "Cancel")}
            onClick={onClose}
          />
          <Button
            type="submit"
            form="new-app-form"
            variant="primary"
            label={t("desktop.dialog.newApp.create", "Create")}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}

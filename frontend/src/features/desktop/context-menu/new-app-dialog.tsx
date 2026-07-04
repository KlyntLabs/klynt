import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("desktop.dialog.newApp.title", "Create new app")}</DialogTitle>
          <DialogDescription>
            {t("desktop.dialog.newApp.description", "Choose a type and name for your new app.")}
          </DialogDescription>
        </DialogHeader>
        <form id="new-app-form" onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Field>
              <FieldLabel htmlFor="new-app-title">
                {t("desktop.dialog.newApp.titleLabel", "Title")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="new-app-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={MAX_TITLE_LENGTH}
                  aria-invalid={!!error}
                  aria-describedby={error ? "new-app-error" : undefined}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-app-type">
                {t("desktop.dialog.newApp.typeLabel", "Type")}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={type}
                  onValueChange={(value) => {
                    if (isAppType(value)) {
                      setType(value);
                    }
                  }}
                >
                  <SelectTrigger
                    id="new-app-type"
                    aria-label={t("desktop.dialog.newApp.typeLabel", "Type")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appTypes.map((appType) => (
                      <SelectItem key={appType.id} value={appType.id}>
                        {appType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            {error && <FieldError id="new-app-error">{error}</FieldError>}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("desktop.dialog.newApp.cancel", "Cancel")}
          </Button>
          <Button type="submit" form="new-app-form">
            {t("desktop.dialog.newApp.create", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

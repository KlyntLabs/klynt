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

type ConflictDialogProps = {
  open: boolean;
  title?: string;
  message?: string;
  onReload: () => void;
  onRetry: () => void;
  onClose: () => void;
};

export function ConflictDialog(props: ConflictDialogProps): React.JSX.Element {
  const { open, title, message, onReload, onRetry, onClose } = props;
  const { t } = useTranslation("home");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>{title ?? t("desktop.conflict.title")}</DialogTitle>
          <DialogDescription>{message ?? t("desktop.conflict.message")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("desktop.conflict.cancel")}
          </Button>
          <Button variant="secondary" onClick={onRetry}>
            {t("desktop.conflict.retry")}
          </Button>
          <Button onClick={onReload}>{t("desktop.conflict.reload")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

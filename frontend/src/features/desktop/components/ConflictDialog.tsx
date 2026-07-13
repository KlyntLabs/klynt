import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import * as React from "react";
import { useTranslation } from "react-i18next";

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
    // purpose="required": a save conflict must be resolved deliberately, so neither a
    // backdrop click nor Escape may dismiss it and silently drop the user's edits.
    <Dialog isOpen={open} onOpenChange={(isOpen) => !isOpen && onClose()} purpose="required">
      <VStack gap={4}>
        <DialogHeader
          title={title ?? t("desktop.conflict.title")}
          subtitle={message ?? t("desktop.conflict.message")}
          onOpenChange={(isOpen) => !isOpen && onClose()}
        />
        <HStack gap={2} justify="end">
          <Button variant="secondary" label={t("desktop.conflict.cancel")} onClick={onClose} />
          <Button variant="secondary" label={t("desktop.conflict.retry")} onClick={onRetry} />
          <Button variant="primary" label={t("desktop.conflict.reload")} onClick={onReload} />
        </HStack>
      </VStack>
    </Dialog>
  );
}

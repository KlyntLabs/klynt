import { Banner } from "@astryxdesign/core/Banner";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordApp() {
  const { t } = useTranslation("auth");
  const { token: tokenParam } = useParams<{ token: string }>();
  const token = tokenParam ?? "";

  if (!token) {
    return (
      <VStack padding={6} height="100%" justify="center">
        <Banner role="alert" status="error" title={t("resetPassword.invalidToken")} />
      </VStack>
    );
  }

  return (
    <VStack padding={6} height="100%" justify="center">
      <ResetPasswordForm token={token} />
    </VStack>
  );
}

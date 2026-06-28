import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordApp() {
  const { t } = useTranslation("auth");
  const { token: tokenParam } = useParams<{ token: string }>();
  const token = tokenParam ?? "";

  if (!token) {
    return (
      <div className="flex flex-col justify-center h-full p-6">
        <p className="text-sm text-destructive" role="alert">
          {t("resetPassword.invalidToken")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center h-full p-6">
      <ResetPasswordForm token={token} />
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordApp() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

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

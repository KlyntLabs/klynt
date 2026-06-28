import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ForgotPasswordForm } from "./forgot-password-form";

export function ForgotPasswordApp() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex flex-col justify-center h-full p-6 space-y-4">
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          {t("forgotPassword.backToLogin")}
        </Link>
      </p>
    </div>
  );
}

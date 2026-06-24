import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LoginForm } from "./login-form";

export function LoginApp() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex flex-col justify-center h-full p-6 space-y-4">
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link to="/register" className="text-primary hover:underline">
          {t("login.register")}
        </Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/forgot-password" className="text-primary hover:underline">
          {t("login.forgotPassword")}
        </Link>
      </p>
    </div>
  );
}

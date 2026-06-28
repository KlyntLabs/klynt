import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RegisterForm } from "./register-form";

export function RegisterApp() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex flex-col justify-center h-full p-6 space-y-4">
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link to="/login" className="text-primary hover:underline">
          {t("register.login")}
        </Link>
      </p>
    </div>
  );
}

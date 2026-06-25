import { useTranslation } from "react-i18next";
import { buildApexUrl } from "@/core/routing/subdomain-url";
import { LoginForm } from "./login-form";

export function LoginApp() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex flex-col justify-center h-full p-6 space-y-4">
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <a href={buildApexUrl("/register")} className="text-primary hover:underline">
          {t("login.register")}
        </a>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        <a href={buildApexUrl("/forgot-password")} className="text-primary hover:underline">
          {t("login.forgotPassword")}
        </a>
      </p>
    </div>
  );
}

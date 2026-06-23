import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}

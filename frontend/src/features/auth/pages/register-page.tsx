import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
          <CardDescription>{t("register.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            {t("register.hasAccount")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("register.login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

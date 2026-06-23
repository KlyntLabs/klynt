import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("forgotPassword.title")}</CardTitle>
          <CardDescription>{t("forgotPassword.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ForgotPasswordForm />
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              {t("forgotPassword.backToLogin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

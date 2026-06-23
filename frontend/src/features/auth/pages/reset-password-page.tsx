import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("resetPassword.title")}</CardTitle>
          <CardDescription>{t("resetPassword.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-destructive" role="alert">
              {t("resetPassword.invalidToken")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

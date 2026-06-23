import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useVerifyEmail } from "@/core/auth/hooks/use-verify-email";

export default function VerifyEmailPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verify = useVerifyEmail();

  useEffect(() => {
    if (token && !verify.isPending && !verify.isSuccess && !verify.isError) {
      verify.mutate({ token });
    }
  }, [token, verify]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("verifyEmail.title")}</CardTitle>
          <CardDescription>{t("verifyEmail.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    </div>
  );
}

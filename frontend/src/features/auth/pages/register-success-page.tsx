import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const locationStateSchema = z.object({
  email: z.string().optional(),
});

export default function RegisterSuccessPage() {
  const { t } = useTranslation(["auth", "common"]);
  const location = useLocation();
  const state = locationStateSchema.safeParse(location.state).data;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth:register.success.title")}</CardTitle>
          <CardDescription>
            {state?.email
              ? t("auth:register.success.messageWithEmail", { email: state.email })
              : t("auth:register.success.message")}
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <Button asChild className="w-full">
            <Link to="/login">{t("auth:register.success.goToLogin")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

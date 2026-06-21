import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routePaths } from "./route-paths";

export default function NotFoundPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("notFound.title")}</CardTitle>
          <CardDescription>{t("notFound.message")}</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <Button asChild className="w-full">
            <Link to={routePaths.home}>{t("notFound.goHome")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

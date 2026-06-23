import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routePaths } from "@/core/routing/route-paths";
import { CreateTenantForm } from "@/features/tenant";
import { JoinTenantForm } from "../components/join-tenant-form";

export default function OnboardingPage() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const handleSuccess = () => navigate(routePaths.dashboard);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("onboarding.title")}</CardTitle>
          <CardDescription>{t("onboarding.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">{t("onboarding.createTab")}</TabsTrigger>
              <TabsTrigger value="join">{t("onboarding.joinTab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="pt-4">
              <CreateTenantForm onSuccess={handleSuccess} />
            </TabsContent>
            <TabsContent value="join" className="pt-4">
              <JoinTenantForm onSuccess={handleSuccess} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

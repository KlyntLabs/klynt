import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import { buildApexUrl } from "@/core/routing/subdomain-router";
import { LoginForm } from "./login-form";

export function LoginApp() {
  const { t } = useTranslation("auth");

  return (
    <VStack gap={4} padding={6} height="100%" justify="center">
      <LoginForm />
      <Text as="p" type="supporting" display="block" justify="center">
        {t("login.noAccount")} <Link href={buildApexUrl("/register")}>{t("login.register")}</Link>
      </Text>
      <Text as="p" type="supporting" display="block" justify="center">
        <Link href={buildApexUrl("/forgot-password")}>{t("login.forgotPassword")}</Link>
      </Text>
    </VStack>
  );
}

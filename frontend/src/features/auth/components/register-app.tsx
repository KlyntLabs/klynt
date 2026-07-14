import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { RegisterForm } from "./register-form";

export function RegisterApp() {
  const { t } = useTranslation("auth");

  return (
    <VStack gap={4} padding={6} height="100%" justify="center">
      <RegisterForm />
      <Text as="p" type="supporting" display="block" justify="center">
        {t("register.hasAccount")}{" "}
        {/* Astryx Link renders an <a> (and honours `as`) only when `href` is set; without it
            it degrades to a <button> and drops `as`. `to` drives react-router's SPA nav. */}
        <Link as={RouterLink} href="/login" {...({ to: "/login" } as { to?: string })}>
          {t("register.login")}
        </Link>
      </Text>
    </VStack>
  );
}

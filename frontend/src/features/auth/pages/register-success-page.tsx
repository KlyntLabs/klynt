import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { z } from "zod";

const locationStateSchema = z.object({
  email: z.string().optional(),
});

export default function RegisterSuccessPage() {
  const { t } = useTranslation(["auth", "common"]);
  const location = useLocation();
  const state = locationStateSchema.safeParse(location.state).data;

  return (
    <Center height="100vh">
      <EmptyState
        title={t("auth:register.success.title")}
        headingLevel={1}
        description={
          state?.email
            ? t("auth:register.success.messageWithEmail", { email: state.email })
            : t("auth:register.success.message")
        }
        actions={
          <Link as={RouterLink} {...({ to: "/login" } as { to?: string })}>
            {t("auth:register.success.goToLogin")}
          </Link>
        }
      />
    </Center>
  );
}

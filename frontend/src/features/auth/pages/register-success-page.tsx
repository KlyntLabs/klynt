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
          // href is load-bearing, not redundant: Astryx's Link renders an anchor (and honours
          // `as`) only when href is set. Without it this degrades to a non-navigating button —
          // the one action a freshly-registered user needs. See register-success-page.test.tsx.
          <Link as={RouterLink} href="/login" {...({ to: "/login" } as { to?: string })}>
            {t("auth:register.success.goToLogin")}
          </Link>
        }
      />
    </Center>
  );
}

import { Banner } from "@astryxdesign/core/Banner";
import { Center } from "@astryxdesign/core/Center";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";
import { createApiError } from "@/core/api/api-error";
import { useVerifyEmail } from "@/core/auth/hooks/use-verify-email";

export function VerifyEmailApp() {
  const { t } = useTranslation("auth");
  const { token: tokenParam } = useParams<{ token: string }>();
  const token = tokenParam ?? "";
  const verify = useVerifyEmail();

  useEffect(() => {
    if (token && !verify.isPending && !verify.isSuccess && !verify.isError) {
      verify.mutate({ token });
    }
  }, [token, verify]);

  // A failed verification (an expired link is the common case) used to leave the spinner
  // running forever — the only signal was a toast that vanished after 5s.
  if (verify.isError) {
    return (
      <VStack gap={4} padding={6} height="100%" justify="center">
        <Banner
          role="alert"
          status="error"
          title={t("verifyEmail.errorTitle")}
          description={verify.error ? createApiError(verify.error).message : t("verifyEmail.error")}
          endContent={
            <Link as={RouterLink} href="/login" {...({ to: "/login" } as { to?: string })}>
              {t("verifyEmail.backToLogin")}
            </Link>
          }
        />
      </VStack>
    );
  }

  return (
    <Center height="100%">
      <Spinner />
    </Center>
  );
}

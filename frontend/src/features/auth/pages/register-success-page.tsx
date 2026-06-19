import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { routePaths } from "@/core/routing/route-paths";

const locationStateSchema = z.object({
  user: z
    .object({
      name: z.string(),
      email: z.string(),
    })
    .optional(),
});

export default function RegisterSuccessPage() {
  const { t } = useTranslation(["auth", "common"]);
  const location = useLocation();
  const state = locationStateSchema.safeParse(location.state).data;

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t("register.success.title")}</h1>
      {state?.user ? (
        <p className="text-muted-foreground">
          {t("register.success.messageWithName", {
            name: state.user.name,
            email: state.user.email,
          })}
        </p>
      ) : (
        <p className="text-muted-foreground">{t("register.success.message")}</p>
      )}
      <Link to={routePaths.home} className="mt-4 inline-block text-primary hover:underline">
        {t("common:actions.goHome")}
      </Link>
    </div>
  );
}

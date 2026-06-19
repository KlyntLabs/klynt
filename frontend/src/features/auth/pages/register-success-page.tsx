import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";

interface LocationState {
  user?: { name: string; email: string };
}

export default function RegisterSuccessPage() {
  const { t } = useTranslation(["auth", "common"]);
  const location = useLocation();
  const state = location.state as LocationState | undefined;

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

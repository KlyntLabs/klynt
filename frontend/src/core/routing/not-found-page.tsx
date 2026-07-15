import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { routePaths } from "./route-paths";

export default function NotFoundPage() {
  const { t } = useTranslation("ui");

  return (
    <Center height="100vh">
      <EmptyState
        title={t("notFound.title")}
        description={t("notFound.message")}
        headingLevel={1}
        actions={
          // `as` lets Astryx's Link render react-router's Link, so this stays a client-side
          // navigation rather than a full page load. `to` is spread through a cast: Astryx's
          // LinkProps has no `to` (its BaseProps are HTML-attribute based), but Link does
          // forward rest props to the `as` component, so it lands on RouterLink at runtime.
          //
          // `href` is NOT redundant next to `to`. Astryx's Link only renders an anchor — and
          // only honours `as` — when href is set; without it the whole thing degrades to
          // `<button type="button" to="/">`: no href, no link role, no navigation. It renders
          // the right label and does nothing. Covered by not-found-page.test.tsx.
          <Link
            as={RouterLink}
            href={routePaths.home}
            {...({ to: routePaths.home } as { to?: string })}
          >
            {t("notFound.goHome")}
          </Link>
        }
      />
    </Center>
  );
}

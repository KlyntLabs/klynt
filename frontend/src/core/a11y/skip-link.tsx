import { Link } from "@astryxdesign/core/Link";
import { useTranslation } from "react-i18next";
import styles from "./skip-link.module.css";

interface SkipLinkProps {
  targetId: string;
  className?: string;
}

/*
 * The element is Astryx's `Link` (a real <a> when `href` is set), not a raw anchor.
 *
 * Astryx's `VisuallyHidden` is NOT the right primitive here despite the name: its docs say it
 * "deliberately has no styling props; the whole point is to stay invisible", and a skip link must
 * do the opposite on focus — reveal itself as the first thing a keyboard user sees. The clipped-
 * box CSS in skip-link.module.css is the WAI-recommended sr-only technique, not a design value.
 */
export function SkipLink({ targetId, className }: SkipLinkProps) {
  const { t } = useTranslation("ui");

  return (
    <Link
      href={`#${targetId}`}
      className={className ? `${styles.skipLink} ${className}` : styles.skipLink}
    >
      {t("skipLink")}
    </Link>
  );
}

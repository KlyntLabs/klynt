import { useTranslation } from "react-i18next";
import styles from "./skip-link.module.css";

interface SkipLinkProps {
  targetId: string;
  className?: string;
}

export function SkipLink({ targetId, className }: SkipLinkProps) {
  const { t } = useTranslation("ui");

  return (
    <a
      href={`#${targetId}`}
      className={className ? `${styles.skipLink} ${className}` : styles.skipLink}
    >
      {t("skipLink")}
    </a>
  );
}

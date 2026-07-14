import { Text } from "@astryxdesign/core/Text";
import styles from "./brand-logo.module.css";

export function BrandLogo({ label, alt }: { label: string; alt: string }) {
  return (
    <div className={styles.brand}>
      {/*
       * The wordmark is a brand asset, not a themed surface: its geometry is fixed. The accent
       * is drawn from the theme so it tracks the brand colour, and the plate uses the inverted
       * background token so the mark stays legible in both colour modes.
       */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt}
      >
        <rect width="32" height="32" rx="7" fill="var(--color-accent)" />
        <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="var(--color-on-accent)" />
        <circle cx="22" cy="12" r="2" fill="var(--color-on-accent)" />
      </svg>
      <Text type="label" weight="semibold">
        {label}
      </Text>
    </div>
  );
}

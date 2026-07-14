import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { SkipLink } from "@/core/a11y/skip-link";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";
import styles from "./root-layout.module.css";

const MAIN_ID = "main-content";

export function RootLayout() {
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className={styles.root}>
      <SkipLink targetId={MAIN_ID} />
      <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

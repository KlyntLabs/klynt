import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { SkipLink } from "@/core/a11y/skip-link";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";

const MAIN_ID = "main-content";

export function RootLayout() {
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink targetId={MAIN_ID} />
      <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </main>
    </div>
  );
}

import { routePaths } from "@/core/routing/route-paths";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";
import { useRef } from "react";
import { Link, Outlet } from "react-router-dom";

export function RootLayout() {
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <nav className="flex gap-4">
          <Link to={routePaths.home} className="font-semibold hover:underline">
            Klynt
          </Link>
          <Link to={routePaths.dashboard} className="hover:underline">
            Dashboard
          </Link>
          <Link to={routePaths.register} className="hover:underline">
            Register
          </Link>
        </nav>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

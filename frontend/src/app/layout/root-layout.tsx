import { routePaths } from "@/routes/route-paths";
import { Link, Outlet } from "react-router-dom";

export function RootLayout() {
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
          <Link to={routePaths.login} className="hover:underline">
            Login
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

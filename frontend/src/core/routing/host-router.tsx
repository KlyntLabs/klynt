import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { getHostContext } from "./host-context";
import { createAdminRouter } from "./routers/admin-router";
import { createApexRouter } from "./routers/apex-router";
import { loginRouter } from "./routers/login-router";
import { createProfileRouter } from "./routers/profile-router";
import { createTenantRouter } from "./routers/tenant-router";

export function HostRouter() {
  const hostname = window.location.hostname;
  const router = useMemo(() => {
    const ctx = getHostContext(hostname);
    switch (ctx.type) {
      case "login":
        return loginRouter;
      case "admin":
        return createAdminRouter();
      case "tenant":
        return createTenantRouter(ctx.slug);
      case "profile":
        return createProfileRouter(ctx.username);
      default:
        return createApexRouter();
    }
  }, [hostname]);

  return <RouterProvider router={router} />;
}

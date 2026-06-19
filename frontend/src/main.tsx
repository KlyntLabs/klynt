import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { apiClient } from "@/core/api/api-client";
import { registerAuthInterceptor } from "@/core/api/auth-interceptor";
import { reportWebVitals } from "@/core/performance/web-vitals";
import { router } from "@/core/routing/route-tree";
import "@/index.css";

registerAuthInterceptor(apiClient);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
);

reportWebVitals();

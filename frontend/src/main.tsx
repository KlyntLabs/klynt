import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/app/providers";
import { apiClient } from "@/core/api/api-client";
import { createAuthInterceptorDeps, registerAuthInterceptor } from "@/core/api/auth-interceptor";
import { reportWebVitals } from "@/core/performance/web-vitals";
import { HostRouter } from "@/core/routing/host-router";
import "@/index.css";

registerAuthInterceptor(apiClient, createAuthInterceptorDeps());

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <HostRouter />
    </AppProviders>
  </StrictMode>
);

reportWebVitals();

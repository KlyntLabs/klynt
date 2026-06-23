import type { AxiosInstance } from "axios";
import axios from "axios";
import { createApiError } from "@/core/api/api-error";
import { useAuthStore } from "@/core/auth/auth-store";
import { logger } from "@/core/logger";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh"];

export interface AuthInterceptorDeps {
  /** Clear the authenticated session. */
  clearSession: () => void;
  /** Logger used for security and server-error events. */
  logger: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  };
}

function createHandleUnauthorized(deps: AuthInterceptorDeps) {
  return function handleUnauthorized(error: unknown) {
    const apiError = createApiError(error);
    const isAxiosErr = axios.isAxiosError(error);

    if (apiError.isUnauthorized) {
      const requestUrl = isAxiosErr ? error.config?.url : undefined;
      const isAuthEndpoint = requestUrl
        ? AUTH_ENDPOINTS.some((path) => requestUrl.endsWith(path))
        : false;

      if (!isAuthEndpoint) {
        deps.logger.info("Unauthorized API response; clearing session", { url: requestUrl });
        deps.clearSession();
      }
    }

    if (apiError.status >= 500) {
      deps.logger.error("Server error", {
        status: apiError.status,
        code: apiError.code,
        url: isAxiosErr ? error.config?.url : undefined,
      });
    }

    return Promise.reject(apiError);
  };
}

export function registerAuthInterceptor(client: AxiosInstance, deps: AuthInterceptorDeps) {
  client.interceptors.response.use((response) => response, createHandleUnauthorized(deps));
}

/** Production dependency set wired to the global auth store and logger. */
export function createAuthInterceptorDeps(): AuthInterceptorDeps {
  return {
    clearSession: () => useAuthStore.getState().clearSession(),
    logger,
  };
}

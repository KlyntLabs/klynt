import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import { createApiError } from "@/core/api/api-error";
import { useAuthStore } from "@/core/auth/auth-store";
import { logger } from "@/core/logger";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh"];

function attachToken(config: InternalAxiosRequestConfig) {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

function handleUnauthorized(error: unknown) {
  const apiError = createApiError(error);
  const isAxiosErr = axios.isAxiosError(error);

  if (apiError.isUnauthorized) {
    const requestUrl = isAxiosErr ? error.config?.url : undefined;
    const isAuthEndpoint = requestUrl
      ? AUTH_ENDPOINTS.some((path) => requestUrl.endsWith(path))
      : false;

    if (!isAuthEndpoint) {
      logger.info("Unauthorized API response; clearing session", { url: requestUrl });
      useAuthStore.getState().clearSession();
    }
  }

  if (apiError.status >= 500) {
    logger.error("Server error", {
      status: apiError.status,
      code: apiError.code,
      url: isAxiosErr ? error.config?.url : undefined,
    });
  }

  return Promise.reject(apiError);
}

export function registerAuthInterceptor(client: AxiosInstance) {
  client.interceptors.request.use(attachToken);
  client.interceptors.response.use((response) => response, handleUnauthorized);
}

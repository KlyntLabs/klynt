import { useAuthStore } from "@/core/auth/auth-store";
import { logger } from "@/core/logger";
import axios from "axios";
import { createApiError } from "./api-error";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh"];

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = createApiError(error);

    if (apiError.isUnauthorized) {
      const requestUrl = axios.isAxiosError(error) ? error.config?.url : undefined;
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
        url: axios.isAxiosError(error) ? error.config?.url : undefined,
      });
    }

    return Promise.reject(apiError);
  }
);

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

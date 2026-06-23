import axios from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.data && typeof config.data === "object") {
    config.data = decamelizeKeys(config.data);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object") {
      response.data = camelizeKeys(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.data && typeof error.response.data === "object") {
      error.response.data = camelizeKeys(error.response.data);
    }
    return Promise.reject(error);
  }
);

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

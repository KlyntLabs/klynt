import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // TODO: global error handling (toast, logout on 401, etc.)
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

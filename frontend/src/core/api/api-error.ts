import { isAxiosError } from "axios";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly isUnauthorized: boolean;

  constructor({
    message,
    status,
    code,
  }: {
    message: string;
    status: number;
    code: string;
  }) {
    super(message);
    this.status = status;
    this.code = code;
    this.isUnauthorized = status === 401;
    this.name = "ApiError";
  }
}

export function createApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as
      | { code?: string; message?: string; error?: string }
      | undefined;
    return new ApiError({
      message: data?.message ?? data?.error ?? error.message ?? "An unexpected error occurred",
      status,
      code: data?.code?.toLowerCase() ?? "UNKNOWN_ERROR",
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      status: 0,
      code: "UNKNOWN_ERROR",
    });
  }

  return new ApiError({
    message: "An unexpected error occurred",
    status: 0,
    code: "UNKNOWN_ERROR",
  });
}

import {
  Mutation,
  MutationCache,
  QueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { apiClient, generateIdempotencyKey } from "./api-client";
import { ApiError, createApiError } from "./api-error";
import { createAuthInterceptorDeps, registerAuthInterceptor } from "./auth-interceptor";

export type ApiQueryOptions<T> = Omit<UseQueryOptions<T, ApiError, T>, "queryKey" | "queryFn">;

export type ApiMutationOptions<T, V> = Omit<UseMutationOptions<T, ApiError, V>, "mutationFn">;

export interface QueryClientOptions {
  onMutationError?: (
    error: ApiError,
    mutation: Mutation<unknown, unknown, unknown, unknown>
  ) => void;
}

export function createQueryClient({ onMutationError }: QueryClientOptions = {}) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (onMutationError && error instanceof ApiError) {
          onMutationError(error, mutation);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: ApiQueryOptions<T>
) {
  return useQuery<T, ApiError, T>({ queryKey, queryFn, ...options });
}

export function useApiMutation<T, V = unknown>(
  mutationFn: (variables: V) => Promise<T>,
  options?: ApiMutationOptions<T, V>
) {
  return useMutation<T, ApiError, V>({ mutationFn, ...options });
}

export function useIdempotentMutation<T, V = unknown>(
  mutationFn: (variables: V, idempotencyKey: string) => Promise<T>,
  options?: ApiMutationOptions<T, V>
) {
  return useMutation<T, ApiError, V>({
    mutationFn: (variables) => mutationFn(variables, generateIdempotencyKey()),
    ...options,
  });
}

export {
  ApiError,
  apiClient,
  createApiError,
  createAuthInterceptorDeps,
  generateIdempotencyKey,
  registerAuthInterceptor,
};

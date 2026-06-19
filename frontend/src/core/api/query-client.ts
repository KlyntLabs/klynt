import { Mutation, MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-error";

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

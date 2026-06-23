import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revokeSession } from "../api/session-api";

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });
}

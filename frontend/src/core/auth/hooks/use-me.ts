import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMe } from "../api/auth-api";
import { useAuthStore } from "../auth-store";

export function useMe() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setLoading = useAuthStore((state) => state.setLoading);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setSession(query.data);
    }
  }, [query.isSuccess, query.data, setSession]);

  useEffect(() => {
    if (query.isError) {
      clearSession();
      setLoading(false);
    }
  }, [query.isError, clearSession, setLoading]);

  return query;
}

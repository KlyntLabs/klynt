import { useQuery } from "@tanstack/react-query";
import { listSessions } from "../api/session-api";

export function useSessions() {
  return useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: listSessions,
  });
}

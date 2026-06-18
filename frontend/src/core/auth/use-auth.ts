import { useAuthStore } from "./auth-store";
import type { User } from "./types";

export interface UseAuthResult {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
}

export function useAuth(): UseAuthResult {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return { user, token, isAuthenticated, isLoading, setSession, clearSession };
}

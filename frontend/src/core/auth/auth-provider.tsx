import { useEffect } from "react";
import { useAuthStore } from "./auth-store";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // The backend has no session/token endpoint yet, so there is nothing to restore.
    // When a persistent session mechanism (e.g., httpOnly cookie + /me) is added,
    // replace this no-op with a real restore call.
    setLoading(false);
  }, [setLoading]);

  return <>{children}</>;
}

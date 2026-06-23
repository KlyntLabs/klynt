import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Tenant } from "@/features/tenant";
import type { AuthState, User } from "./types";

interface AuthStore extends AuthState {
  activeTenant: Tenant | null;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  setLoading: (isLoading: boolean) => void;
  setActiveTenant: (tenant: Tenant | null) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,
      activeTenant: null,
      setSession: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
      clearSession: () => set({ ...initialState, activeTenant: null, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setActiveTenant: (activeTenant) => set({ activeTenant }),
      reset: () => set({ ...initialState, activeTenant: null }),
    }),
    { name: "auth-store" }
  )
);

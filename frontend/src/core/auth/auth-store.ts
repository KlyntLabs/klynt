import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Tenant } from "@/features/tenant";
import type { AuthState, User } from "./types";

interface AuthStore extends AuthState {
  activeTenant: Tenant | null;
  setSession: (user: User) => void;
  clearSession: () => void;
  setLoading: (isLoading: boolean) => void;
  setActiveTenant: (tenant: Tenant | null) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,
      activeTenant: null,
      setSession: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      clearSession: () => set({ ...initialState, activeTenant: null, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setActiveTenant: (activeTenant) => set({ activeTenant }),
      reset: () => set({ ...initialState, activeTenant: null }),
    }),
    { name: "auth-store" }
  )
);

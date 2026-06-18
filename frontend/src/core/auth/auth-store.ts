import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AuthState, User } from "./types";

interface AuthStore extends AuthState {
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  setLoading: (isLoading: boolean) => void;
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
      setSession: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
      clearSession: () => set({ ...initialState, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set(initialState),
    }),
    { name: "auth-store" }
  )
);

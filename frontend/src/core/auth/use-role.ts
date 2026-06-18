import { useAuth } from "./use-auth";
import type { Role } from "./types";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isTeacher: role === "teacher" || role === "admin",
    isInstructor: role === "teacher" || role === "admin",
    isParent: role === "parent",
    hasRole: (allowedRoles: Role[]) => (role ? allowedRoles.includes(role) : false),
  };
}

import type { Role } from "./types";
import { useAuth } from "./use-auth";

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

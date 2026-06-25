import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/core/auth/auth-identity";
import { getTenant } from "../api/tenant-api";

export function useTenant(slug: string) {
  const { user } = useAuth();
  return useQuery({
    // Include the user id so the cache is scoped to the current identity; a
    // different user may have different tenant memberships/roles.
    queryKey: ["tenants", slug, user?.id ?? "anonymous"],
    queryFn: () => getTenant(slug),
    enabled: slug.length > 0,
  });
}

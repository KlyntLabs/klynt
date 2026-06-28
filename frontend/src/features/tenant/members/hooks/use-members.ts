import { useQuery } from "@tanstack/react-query";
import { memberApi } from "../api/member-api";

export function useMembers(tenantSlug: string) {
  return useQuery({
    queryKey: ["tenants", tenantSlug, "members"],
    queryFn: async () => {
      const { data } = await memberApi.list(tenantSlug);
      return data.data;
    },
    enabled: tenantSlug.length > 0,
  });
}

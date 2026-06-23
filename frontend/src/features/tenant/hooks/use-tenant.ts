import { useQuery } from "@tanstack/react-query";
import { getTenant } from "../api/tenant-api";

export function useTenant(slug: string) {
  return useQuery({
    queryKey: ["tenants", slug],
    queryFn: () => getTenant(slug),
    enabled: slug.length > 0,
  });
}

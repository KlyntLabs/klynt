import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getHostContext } from "@/core/routing/host-context";

/**
 * Return the tenant slug for the current context.
 *
 * When the app is running on a tenant subdomain (e.g. `acme-test.lvh.me`)
 * the slug is taken from the hostname, because React Router route params are
 * empty inside desktop windows. For admin/profile routes that include the slug
 * in the path, the route param is used as a fallback.
 */
export function useTenantSlug(): string {
  const { slug } = useParams<{ slug: string }>();

  return useMemo(() => {
    const hostContext = getHostContext(window.location.hostname);
    if (hostContext.type === "tenant") {
      return hostContext.slug;
    }
    return slug ?? "";
  }, [slug]);
}

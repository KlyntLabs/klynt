import { useSearchParams } from "react-router-dom";
import { getBaseDomain } from "@/core/routing/host-context";
import { buildApexUrl } from "@/core/routing/subdomain-url";

export function isAllowedRedirectUrl(url: string): boolean {
  if (url.startsWith("/")) {
    return !url.startsWith("//");
  }
  try {
    const parsed = new URL(url);
    const base = getBaseDomain().toLowerCase();
    const host = parsed.hostname.toLowerCase();
    return host === base || host.endsWith(`.${base}`);
  } catch {
    return false;
  }
}

export function useRedirectTarget(fallback = buildApexUrl("/dashboard")): string {
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  return from && isAllowedRedirectUrl(from) ? from : fallback;
}

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "login",
  "admin",
  "u",
  "api",
  "app",
  "mail",
  "ftp",
  "cdn",
  "static",
]);

export type HostContext =
  | { type: "apex" }
  | { type: "login" }
  | { type: "login_misroute" }
  | { type: "admin" }
  | { type: "tenant"; slug: string }
  | { type: "profile"; username: string }
  | { type: "reserved"; subdomain: string }
  | { type: "unknown"; subdomain: string };

export type TenantHostContext = Extract<HostContext, { type: "tenant" }>;
export type ProfileHostContext = Extract<HostContext, { type: "profile" }>;

export function getBaseDomain(): string {
  return (import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? window.location.hostname;
}

export function getHostContext(
  hostname = window.location.hostname,
  baseDomain = getBaseDomain()
): HostContext {
  const host = hostname.toLowerCase();
  const base = baseDomain.toLowerCase();
  const prefix =
    host === base ? "" : host.endsWith(`.${base}`) ? host.slice(0, -(base.length + 1)) : "";

  if (prefix && prefix !== "www") {
    if (prefix === "login") {
      return { type: "login" };
    }

    if (prefix === "admin") {
      return { type: "admin" };
    }

    if (prefix.startsWith("u.")) {
      const username = prefix.slice(2);
      return username ? { type: "profile", username } : { type: "unknown", subdomain: prefix };
    }

    if (prefix.includes(".")) {
      if (prefix.startsWith("login.")) {
        return { type: "login_misroute" };
      }
      return { type: "unknown", subdomain: prefix };
    }

    if (RESERVED_SUBDOMAINS.has(prefix)) {
      return { type: "reserved", subdomain: prefix };
    }

    return { type: "tenant", slug: prefix };
  }

  // Fallback for missing or misconfigured base domain: detect reserved
  // subdomains heuristically so URL builders don't double-prefix them.
  if (host.startsWith("login.")) {
    const rest = host.slice(6);
    const dotCount = rest.split(".").length - 1;
    // A host like `login.tenant.lvh.me` has more than one dot after `login.`,
    // indicating a misrouted nested subdomain. `login.lvh.me` has exactly one.
    if (dotCount > 1) {
      return { type: "login_misroute" };
    }
    return { type: "login" };
  }

  if (host.startsWith("admin.")) {
    return { type: "admin" };
  }

  const profileMatch = /^u\.([^.]+)\./.exec(host);
  if (profileMatch) {
    return { type: "profile", username: profileMatch[1] };
  }

  return { type: "apex" };
}

export function isApexHost(hostname?: string): boolean {
  return getHostContext(hostname).type === "apex";
}

export function isTenantHost(hostname?: string): boolean {
  return getHostContext(hostname).type === "tenant";
}

export function isProfileHost(hostname?: string): boolean {
  return getHostContext(hostname).type === "profile";
}

export function isLoginMisrouteHost(hostname?: string): boolean {
  return getHostContext(hostname).type === "login_misroute";
}

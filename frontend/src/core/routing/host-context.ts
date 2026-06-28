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

  if (!prefix || prefix === "www") {
    return { type: "apex" };
  }

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
    return { type: "unknown", subdomain: prefix };
  }

  if (RESERVED_SUBDOMAINS.has(prefix)) {
    return { type: "reserved", subdomain: prefix };
  }

  return { type: "tenant", slug: prefix };
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

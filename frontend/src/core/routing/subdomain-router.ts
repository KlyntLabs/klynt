import {
  getBaseDomain,
  getHostContext,
  type HostContext,
  isApexHost,
  isProfileHost,
  isTenantHost,
  type ProfileHostContext,
  type TenantHostContext,
} from "./host-context";

export {
  getBaseDomain,
  getHostContext,
  type HostContext,
  isApexHost,
  isProfileHost,
  isTenantHost,
  type ProfileHostContext,
  type TenantHostContext,
};

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getAppProtocol(): string {
  return (
    (import.meta.env.VITE_APP_PROTOCOL as string | undefined) ??
    window.location.protocol.replace(":", "")
  );
}

export function getBaseHost(): string {
  const host = window.location.host;
  const ctx = getHostContext(window.location.hostname);
  switch (ctx.type) {
    case "apex":
      return host.replace(/^www\./, "");
    case "login":
      return host.slice("login.".length);
    case "admin":
      return host.slice("admin.".length);
    case "tenant":
      return host.slice(ctx.slug.length + 1);
    case "profile":
      return host.slice(`u.${ctx.username}.`.length);
    default: {
      const domain = getBaseDomain();
      const port = window.location.port;
      return port && !domain.includes(":") ? `${domain}:${port}` : domain;
    }
  }
}

export function buildSubdomainUrl(subdomain: string, path = "/"): string {
  const protocol = getAppProtocol();
  const baseHost = getBaseHost();
  return `${protocol}://${subdomain}.${baseHost}${normalizePath(path)}`;
}

export function buildProfileUrl(username: string): string {
  return buildSubdomainUrl(`u.${username}`);
}

export function buildLoginUrl(from?: string): string {
  const url = new URL(buildSubdomainUrl("login"));
  if (from) {
    url.searchParams.set("from", from);
  }
  return url.toString();
}

export function buildTenantUrl(slug: string, path = "/"): string {
  return buildSubdomainUrl(slug, path);
}

export function buildAdminUrl(path = "/"): string {
  return buildSubdomainUrl("admin", path);
}

export function buildApexUrl(path = "/"): string {
  const protocol = getAppProtocol();
  const baseHost = getBaseHost();
  return `${protocol}://${baseHost}${normalizePath(path)}`;
}

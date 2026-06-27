import { useParams } from "react-router-dom";
import { ExternalNavigate } from "@/core/auth/external-redirect";
import { buildAdminUrl, buildLoginUrl, buildProfileUrl, buildTenantUrl } from "./subdomain-router";

export function RedirectToLogin() {
  return <ExternalNavigate to={buildLoginUrl()} />;
}

export function RedirectToAdmin() {
  return <ExternalNavigate to={buildAdminUrl()} />;
}

export function RedirectToAdminPage() {
  return <ExternalNavigate to={buildAdminUrl("/admin")} />;
}

export function RedirectToTenant() {
  const { slug, "*": deepPath } = useParams<{ slug: string; "*": string }>();
  if (!slug) return null;
  const path = deepPath ? `/${deepPath}` : "/";
  return <ExternalNavigate to={buildTenantUrl(slug, path)} />;
}

export function RedirectToProfile() {
  const { username } = useParams<{ username: string }>();
  if (!username) return null;
  return <ExternalNavigate to={buildProfileUrl(username)} />;
}

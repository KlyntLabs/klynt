import { useEffect } from "react";

export function isExternalUrl(url: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function navigateExternal(url: string) {
  window.location.replace(url);
}

export function ExternalNavigate({ to }: { to: string }) {
  useEffect(() => {
    navigateExternal(to);
  }, [to]);
  return null;
}

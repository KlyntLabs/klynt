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
  const resolved = new URL(url, window.location.href);
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    throw new Error(`Refusing to navigate to non-HTTP(S) URL: ${url}`);
  }
  window.location.replace(resolved.toString());
}

export function ExternalNavigate({ to }: { to: string }) {
  useEffect(() => {
    navigateExternal(to);
  }, [to]);
  return null;
}

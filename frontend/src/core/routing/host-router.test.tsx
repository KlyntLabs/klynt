import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { type ReactNode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import type { UserRole } from "@/core/auth/types";
import { server } from "@/test/msw/server";
import { HostRouter } from "./host-router";

const originalDomain = import.meta.env.VITE_APP_DOMAIN;
const originalProtocol = import.meta.env.VITE_APP_PROTOCOL;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createTestQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function render(ui: React.ReactElement) {
  return rtlRender(<Wrapper>{ui}</Wrapper>);
}

function stubLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, "location", {
    value: {
      origin: url.origin,
      host: url.host,
      hostname: url.hostname,
      href: url.href,
      protocol: url.protocol,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      replace: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
  import.meta.env.VITE_APP_DOMAIN = "lvh.me";
  import.meta.env.VITE_APP_PROTOCOL = "http";
}

function setAuthenticated(role: UserRole = "student") {
  useAuthStore.getState().setSession({
    id: "u-1",
    email: "a@b.com",
    username: "jayden",
    name: "Jayden",
    role,
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  });
}

describe("HostRouter", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(false);
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    import.meta.env.VITE_APP_DOMAIN = originalDomain;
    import.meta.env.VITE_APP_PROTOCOL = originalProtocol;
  });

  it("redirects apex tenant path to tenant subdomain", () => {
    stubLocation("http://lvh.me:5174/tenants/acme/members");
    render(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://acme.lvh.me:5174/members");
  });

  it("redirects apex username path to profile subdomain", () => {
    stubLocation("http://lvh.me:5174/jayden");
    render(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://u.jayden.lvh.me:5174/");
  });

  it("redirects apex login path to login subdomain", () => {
    stubLocation("http://lvh.me:5174/login");
    render(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://login.lvh.me:5174/");
  });

  it("redirects apex dashboard path to admin subdomain", () => {
    stubLocation("http://lvh.me:5174/dashboard");
    render(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://admin.lvh.me:5174/");
  });

  it("redirects authenticated login subdomain to apex dashboard", () => {
    setAuthenticated();
    stubLocation("http://login.lvh.me:5174/");
    render(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/dashboard");
  });

  it("redirects non-admin admin subdomain to apex home", () => {
    setAuthenticated("student");
    stubLocation("http://admin.lvh.me:5174/");
    render(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/");
  });

  it("redirects unauthenticated tenant subdomain to login subdomain", async () => {
    stubLocation("http://acme.lvh.me:5174/members");
    server.use(
      http.get("/api/v1/tenants/acme/public", () =>
        HttpResponse.json({ data: { slug: "acme", name: "Acme" } })
      )
    );
    render(<HostRouter />);
    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining("login.lvh.me:5174/?from=")
      )
    );
  });

  it("renders profile subdomain for the owner", async () => {
    setAuthenticated();
    stubLocation("http://u.jayden.lvh.me:5174/");
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({
          data: {
            id: "u-1",
            email: "a@b.com",
            username: "jayden",
            full_name: "Jayden",
            role: "student",
            status: "active",
            created_at: "2024-01-01T00:00:00Z",
          },
        })
      )
    );
    const { getByText } = render(<HostRouter />);
    await waitFor(() => expect(getByText("This is your public profile.")).toBeInTheDocument());
  });
});

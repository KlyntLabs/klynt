import { render as rtlRender, waitFor } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { loginRouter } from "./login-router";

vi.mock("@/features/auth", () => ({
  LoginPage: () => <div data-testid="login-page">Login</div>,
}));

const originalDomain = import.meta.env.VITE_APP_DOMAIN;
const originalProtocol = import.meta.env.VITE_APP_PROTOCOL;

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

function setAuthenticated() {
  useAuthStore.getState().setSession({
    id: "u-1",
    email: "a@b.com",
    username: "jayden",
    name: "Jayden",
    role: "student",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  });
}

describe("loginRouter", () => {
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

  it("renders the login page for unauthenticated users", async () => {
    stubLocation("http://login.lvh.me:5174/");
    const { getByTestId } = rtlRender(<RouterProvider router={loginRouter} />);
    await waitFor(() => expect(getByTestId("login-page")).toBeInTheDocument());
  });

  it("redirects authenticated users to the apex dashboard", () => {
    setAuthenticated();
    stubLocation("http://login.lvh.me:5174/");
    rtlRender(<RouterProvider router={loginRouter} />);
    expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/dashboard");
  });
});

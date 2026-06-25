import { render as rtlRender, waitFor } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { createApexRouter } from "./apex-router";

vi.mock("@/features/desktop/components/DesktopEnvironment", () => ({
  default: () => <div data-testid="desktop-environment">Desktop</div>,
}));

vi.mock("@/features/auth", () => ({
  LoginPage: () => <div data-testid="login-page">Login</div>,
  RegisterPage: () => <div data-testid="register-page">Register</div>,
  RegisterSuccessPage: () => <div data-testid="register-success-page">Register Success</div>,
  VerifyEmailPage: () => <div data-testid="verify-email-page">Verify Email</div>,
  OnboardingPage: () => <div data-testid="onboarding-page">Onboarding</div>,
  ForgotPasswordPage: () => <div data-testid="forgot-password-page">Forgot Password</div>,
  ResetPasswordPage: () => <div data-testid="reset-password-page">Reset Password</div>,
  SessionsPage: () => <div data-testid="sessions-page">Sessions</div>,
}));

vi.mock("@/features/tenant", () => ({
  CreateTenantPage: () => <div data-testid="create-tenant-page">Create Tenant</div>,
  TenantDesktopPage: ({ slug }: { slug?: string }) => (
    <div data-testid="tenant-desktop-page">Tenant Desktop {slug}</div>
  ),
}));

vi.mock("@/features/user/pages/user-desktop-page", () => ({
  default: () => <div data-testid="user-desktop-page">User Desktop</div>,
}));

vi.mock("@/features/marketing/components/MarketingShell", () => ({
  MarketingShell: ({ route }: { route: string }) => (
    <div data-testid="marketing-shell">{route}</div>
  ),
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
    role: "admin",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  });
}

describe("createApexRouter", () => {
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

  it("renders the marketing desktop at the index route", async () => {
    stubLocation("http://lvh.me:5174/");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("desktop-environment")).toBeInTheDocument());
  });

  it("redirects the legacy login path to the login subdomain", () => {
    stubLocation("http://lvh.me:5174/login");
    const router = createApexRouter();
    rtlRender(<RouterProvider router={router} />);
    expect(window.location.replace).toHaveBeenCalledWith("http://login.lvh.me:5174/");
  });

  it("redirects the legacy admin path to the admin subdomain", () => {
    stubLocation("http://lvh.me:5174/admin");
    const router = createApexRouter();
    rtlRender(<RouterProvider router={router} />);
    expect(window.location.replace).toHaveBeenCalledWith("http://admin.lvh.me:5174/admin");
  });

  it("renders the register page", async () => {
    stubLocation("http://lvh.me:5174/register");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("register-page")).toBeInTheDocument());
  });

  it("renders the forgot password page", async () => {
    stubLocation("http://lvh.me:5174/forgot-password");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("forgot-password-page")).toBeInTheDocument());
  });

  it("renders the reset password page", async () => {
    stubLocation("http://lvh.me:5174/reset-password");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("reset-password-page")).toBeInTheDocument());
  });

  it("renders the verify email page", async () => {
    stubLocation("http://lvh.me:5174/verify-email");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("verify-email-page")).toBeInTheDocument());
  });

  it("renders the onboarding page for authenticated users", async () => {
    setAuthenticated();
    stubLocation("http://lvh.me:5174/onboarding");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("onboarding-page")).toBeInTheDocument());
  });

  it("renders the sessions page for authenticated users", async () => {
    setAuthenticated();
    stubLocation("http://lvh.me:5174/settings/sessions");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("sessions-page")).toBeInTheDocument());
  });

  it("renders the create tenant page for authenticated users", async () => {
    setAuthenticated();
    stubLocation("http://lvh.me:5174/tenants/new");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("create-tenant-page")).toBeInTheDocument());
  });

  it("renders the user desktop for authenticated users", async () => {
    setAuthenticated();
    stubLocation("http://lvh.me:5174/u/u-1");
    const router = createApexRouter();
    const { getByTestId } = rtlRender(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("user-desktop-page")).toBeInTheDocument());
  });
});

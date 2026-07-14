import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/test-config";
import { useInviteMember } from "@/features/tenant/members/hooks/use-invite-member";
import { useRemoveMember } from "@/features/tenant/members/hooks/use-remove-member";
import { useUpdateMemberRole } from "@/features/tenant/members/hooks/use-update-member-role";
import { server } from "@/test/msw/server";
import { useRemoveTenant } from "./use-remove-tenant";
import { useUpdateTenant } from "./use-update-tenant";

function createTestSetup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // `LayerProvider` mounts Astryx's ToastViewport. Each toast is then asserted where the user
  // meets it — on screen, with its interpolated message — instead of on a store that no longer
  // exists. `role="alert"` is the live region Astryx gives an error toast.
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <LayerProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </LayerProvider>
      </I18nextProvider>
    );
  }

  return { queryClient, Wrapper };
}

describe("tenant mutation hooks", () => {
  it("shows a toast when removing a tenant fails", async () => {
    server.use(
      http.delete("/api/v1/tenants/acme", () =>
        HttpResponse.json({ code: "bad_request", message: "bad request" }, { status: 400 })
      )
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useRemoveTenant("acme"), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/Failed to delete tenant:/);
  });

  it("shows a toast when updating a tenant fails", async () => {
    server.use(
      http.patch("/api/v1/tenants/acme", () =>
        HttpResponse.json({ code: "bad_request", message: "bad request" }, { status: 400 })
      )
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useUpdateTenant("acme"), { wrapper: Wrapper });

    result.current.mutate({ name: "Acme Inc" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/Failed to update tenant:/);
  });

  it("shows a toast when inviting a member fails", async () => {
    server.use(
      http.post("/api/v1/tenants/acme/invites", () =>
        HttpResponse.json({ code: "bad_request", message: "bad request" }, { status: 400 })
      )
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useInviteMember("acme"), { wrapper: Wrapper });

    result.current.mutate({ email: "new@example.com", role: "member" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/Failed to invite member:/);
  });

  it("shows a toast when removing a member fails", async () => {
    server.use(
      http.delete("/api/v1/tenants/acme/members", () =>
        HttpResponse.json({ code: "bad_request", message: "bad request" }, { status: 400 })
      )
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useRemoveMember("acme"), { wrapper: Wrapper });

    result.current.mutate("member@example.com");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/Failed to remove member:/);
  });

  it("shows a toast when updating a member role fails", async () => {
    server.use(
      http.patch("/api/v1/tenants/acme/members", () =>
        HttpResponse.json({ code: "bad_request", message: "bad request" }, { status: 400 })
      )
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useUpdateMemberRole("acme"), { wrapper: Wrapper });

    result.current.mutate({ email: "member@example.com", role: "admin" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/Failed to update role:/);
  });
});

import { renderHook } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/test-config";
import { useRegisterSchema } from "./register-schema";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

describe("useRegisterSchema", () => {
  it("requires institutionId for teacher and admin roles", () => {
    const { result } = renderHook(() => useRegisterSchema(), { wrapper: Wrapper });

    const teacherResult = result.current.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "str0ng!passphrase",
      role: "teacher",
      termsAccepted: true,
      termsVersion: "2026-06-18",
    });
    expect(teacherResult.success).toBe(false);

    const adminResult = result.current.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "str0ng!passphrase",
      role: "admin",
      institutionId: "550e8400-e29b-41d4-a716-446655440000",
      termsAccepted: true,
      termsVersion: "2026-06-18",
    });
    expect(adminResult.success).toBe(true);
  });
});

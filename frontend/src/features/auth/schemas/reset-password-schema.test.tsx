import { renderHook } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/test-config";
import { useResetPasswordSchema } from "./reset-password-schema";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

describe("useResetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    const { result } = renderHook(() => useResetPasswordSchema(), { wrapper: Wrapper });
    const parseResult = result.current.safeParse({
      password: "Str0ng!pass",
      confirmPassword: "Str0ng!pass",
    });
    expect(parseResult.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const { result } = renderHook(() => useResetPasswordSchema(), { wrapper: Wrapper });
    const parseResult = result.current.safeParse({
      password: "Str0ng!pass",
      confirmPassword: "different",
    });
    expect(parseResult.success).toBe(false);
  });
});

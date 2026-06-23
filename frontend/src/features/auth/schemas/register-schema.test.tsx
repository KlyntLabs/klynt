import { renderHook } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/test-config";
import { useRegisterSchema } from "./register-schema";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

describe("useRegisterSchema", () => {
  it("validates a complete registration", () => {
    const { result } = renderHook(() => useRegisterSchema(), { wrapper: Wrapper });

    const parseResult = result.current.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "Str0ng!pass",
    });
    expect(parseResult.success).toBe(true);
  });

  it("rejects weak passwords", () => {
    const { result } = renderHook(() => useRegisterSchema(), { wrapper: Wrapper });

    const parseResult = result.current.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "weak",
    });
    expect(parseResult.success).toBe(false);
  });
});

import i18n from "@/core/i18n/test-config";
import { describe, expect, it } from "vitest";

describe("i18n", () => {
  it("translates common keys", () => {
    expect(i18n.t("common:appName")).toBe("Klynt Education Platform");
  });

  it("interpolates variables", () => {
    expect(
      i18n.t("auth:register.success.messageWithName", {
        name: "Ada",
        email: "ada@example.com",
      })
    ).toBe("Welcome, Ada. A verification link has been sent to ada@example.com.");
  });

  it("changes language", async () => {
    await i18n.changeLanguage("vi");
    expect(i18n.t("common:nav.home")).toBe("Klynt");
    expect(i18n.t("common:actions.createAccount")).toBe("Tạo tài khoản");

    await i18n.changeLanguage("cn");
    expect(i18n.t("common:actions.createAccount")).toBe("创建账户");

    await i18n.changeLanguage("en");
  });
});

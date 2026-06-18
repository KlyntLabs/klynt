import { describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("logs structured entry at error level", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("something failed", { requestId: "abc" });
    expect(errorSpy).toHaveBeenCalledOnce();
    const entry = errorSpy.mock.calls[0][0];
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("something failed");
    expect(entry.context).toEqual({ requestId: "abc" });
    errorSpy.mockRestore();
  });
});

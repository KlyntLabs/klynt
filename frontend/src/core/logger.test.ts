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

  it("logs structured entry at warn level", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("something suspicious", { requestId: "abc" });
    expect(warnSpy).toHaveBeenCalledOnce();
    const entry = warnSpy.mock.calls[0][0];
    expect(entry.level).toBe("warn");
    expect(entry.message).toBe("something suspicious");
    warnSpy.mockRestore();
  });

  it("logs structured entry at info level", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("something happened", { requestId: "abc" });
    expect(logSpy).toHaveBeenCalledOnce();
    const entry = logSpy.mock.calls[0][0];
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("something happened");
    logSpy.mockRestore();
  });

  it("logs debug entry in non-production environments", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.debug("debug detail", { requestId: "abc" });
    expect(logSpy).toHaveBeenCalledOnce();
    const entry = logSpy.mock.calls[0][0];
    expect(entry.level).toBe("debug");
    logSpy.mockRestore();
  });
});

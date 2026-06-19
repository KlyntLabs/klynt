import { describe, expect, it } from "vitest";
import { requiresInstitution } from "./role-rules";

describe("requiresInstitution", () => {
  it("returns true for teacher and admin", () => {
    expect(requiresInstitution("teacher")).toBe(true);
    expect(requiresInstitution("admin")).toBe(true);
  });

  it("returns false for student and parent", () => {
    expect(requiresInstitution("student")).toBe(false);
    expect(requiresInstitution("parent")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { routePaths } from "./route-paths";

describe("routePaths", () => {
  it("provides static route paths", () => {
    expect(routePaths.home).toBe("/");
    expect(routePaths.register).toBe("/register");
    expect(routePaths.registerSuccess).toBe("/register/success");
    expect(routePaths.dashboard).toBe("/dashboard");
  });

  it("builds dynamic course and lesson paths", () => {
    expect(routePaths.course("course-123")).toBe("/courses/course-123");
    expect(routePaths.lesson("lesson-456")).toBe("/lessons/lesson-456");
  });
});

import { RegisterForm } from "@/features/auth/components/register-form";
import { render } from "@/test/render";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";

describe("RegisterForm accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<RegisterForm />);
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});

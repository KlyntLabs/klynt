import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

describe("Card accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content</p>
        </CardContent>
      </Card>
    );
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});

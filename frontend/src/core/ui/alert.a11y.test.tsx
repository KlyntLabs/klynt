import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Alert, AlertDescription, AlertTitle } from "./alert";

describe("Alert accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app using the cli.</AlertDescription>
      </Alert>
    );
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});

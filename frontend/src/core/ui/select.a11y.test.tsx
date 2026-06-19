import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("Select accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    const { container } = render(
      <div className="w-[280px] space-y-2">
        <Label htmlFor="a11y-select">Favorite subject</Label>
        <Select>
          <SelectTrigger id="a11y-select">
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="math">Mathematics</SelectItem>
            <SelectItem value="science">Science</SelectItem>
            <SelectItem value="literature">Literature</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});

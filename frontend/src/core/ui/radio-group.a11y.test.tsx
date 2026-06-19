import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    const { container } = render(
      <RadioGroup aria-label="Choose an option" defaultValue="option-one">
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="option-one" value="option-one" />
          <Label className="mb-0" htmlFor="option-one">
            Option One
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="option-two" value="option-two" />
          <Label className="mb-0" htmlFor="option-two">
            Option Two
          </Label>
        </div>
      </RadioGroup>
    );
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});

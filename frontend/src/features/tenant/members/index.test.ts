import { describe, expect, it } from "vitest";
import * as members from ".";

describe("tenant members module exports", () => {
  it("exports members page", () => {
    expect(members.MembersPage).toBeDefined();
  });
});

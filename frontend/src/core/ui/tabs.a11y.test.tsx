import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(
      <Tabs defaultValue="account" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <p>Manage your account settings.</p>
        </TabsContent>
        <TabsContent value="password">
          <p>Change your password.</p>
        </TabsContent>
      </Tabs>
    );

    expect(await screen.findByRole("tab", { name: "Account" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "Password" })).toBeInTheDocument();
    expect(await screen.findByRole("tabpanel")).toBeInTheDocument();

    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});

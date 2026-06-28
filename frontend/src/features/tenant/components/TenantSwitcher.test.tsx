import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/render";
import { TenantSwitcher } from "./TenantSwitcher";

it("renders the active tenant name", async () => {
  render(<TenantSwitcher />);
  expect(await screen.findByText("Acme")).toBeInTheDocument();
});

it("links each tenant to its subdomain", async () => {
  const user = userEvent.setup();
  render(<TenantSwitcher />);

  await user.click(await screen.findByRole("button", { name: "Acme" }));
  const link = await screen.findByRole("menuitem", { name: "Acme" });
  expect(link.getAttribute("href")).toMatch(/^http:\/\/acme\.localhost(:\d+)?\/$/);
});
